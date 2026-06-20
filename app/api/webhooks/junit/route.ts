/**
 * CI JUnit XML Webhook
 *
 * POST /api/webhooks/junit?projectId=xxx&secret=xxx
 * Content-Type: application/xml  (JUnit XML test report)
 *
 * 解析 JUnit XML，匹配已有 TestCase（按 title/id），写入 TestExecution 记录。
 * 安全：要求 webhook secret 参数或在 ProjectSettings 中配置。
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/../lib/prisma';
import { XMLParser } from 'fast-xml-parser';
import { getWebhookSecret, verifyPlainSecret } from '@/../lib/webhook-auth';

// JUnit XML 的简化结构：
// <testsuites> / <testsuite name="..." tests="..." failures="..." errors="...">
//   <testcase name="..." classname="..." time="...">
//     <failure message="..." type="...">stack trace</failure>
//     <error message="..." type="...">stack trace</error>
//   </testcase>
// </testsuite>

interface ParsedTestCase {
  name: string;
  classname?: string;
  time?: number;
  failure?: { message?: string; type?: string; '#text'?: string } | { message?: string; type?: string; '#text'?: string }[];
  error?: { message?: string; type?: string; '#text'?: string } | { message?: string; type?: string; '#text'?: string }[];
}

interface ParsedTestSuite {
  name?: string;
  tests?: number;
  failures?: number;
  errors?: number;
  testcase?: ParsedTestCase | ParsedTestCase[];
}

interface ParsedXML {
  testsuites?: {
    testsuite?: ParsedTestSuite | ParsedTestSuite[];
  };
  testsuite?: ParsedTestSuite;
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const secret = searchParams.get('secret');

  if (!projectId) {
    return NextResponse.json({ message: '缺少 projectId' }, { status: 400 });
  }

  // 验证 webhook secret（来自 WEBHOOK_SECRET 环境变量）
  if (!getWebhookSecret()) {
    return NextResponse.json({ message: '服务端未配置 WEBHOOK_SECRET' }, { status: 503 });
  }
  if (!verifyPlainSecret(secret)) {
    return NextResponse.json({ message: 'webhook secret 无效' }, { status: 401 });
  }

  try {
    const xmlText = await request.text();
    if (!xmlText.trim()) {
      return NextResponse.json({ message: '请求体为空' }, { status: 400 });
    }

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
    const parsed: ParsedXML = parser.parse(xmlText);

    // 标准化：提取所有 testsuite
    let suites: ParsedTestSuite[] = [];
    if (parsed.testsuites?.testsuite) {
      suites = Array.isArray(parsed.testsuites.testsuite)
        ? parsed.testsuites.testsuite
        : [parsed.testsuites.testsuite];
    } else if (parsed.testsuite) {
      suites = [parsed.testsuite];
    }

    // 提取所有 testcase
    const allCases: ParsedTestCase[] = [];
    for (const suite of suites) {
      if (suite.testcase) {
        const cases = Array.isArray(suite.testcase) ? suite.testcase : [suite.testcase];
        allCases.push(...cases);
      }
    }

    if (!allCases.length) {
      return NextResponse.json({ message: '未解析到测试用例' }, { status: 400 });
    }

    // 获取项目中已有测试用例（用于匹配）
    const existingCases = await prisma.testCase.findMany({
      where: { projectId },
      select: { id: true, title: true },
    });

    let matched = 0;
    let created = 0;
    const errors: string[] = [];

    for (const tc of allCases) {
      try {
        const testName = tc.name || tc.classname || 'Unknown';
        const isFailed = !!(tc.failure || tc.error);
        const status = isFailed ? 'FAIL' : 'PASS';

        // 提取失败信息
        let actualResult = '';
        if (tc.failure) {
          const f = Array.isArray(tc.failure) ? tc.failure[0] : tc.failure;
          actualResult = f?.message || f?.['#text'] || 'Test failed';
        } else if (tc.error) {
          const e = Array.isArray(tc.error) ? tc.error[0] : tc.error;
          actualResult = e?.message || e?.['#text'] || 'Test error';
        }

        // 尝试匹配已有用例（按名称模糊匹配）
        const matchedCase = existingCases.find(
          (c) =>
            c.title.toLowerCase().includes(testName.toLowerCase()) ||
            testName.toLowerCase().includes(c.title.toLowerCase()),
        );

        if (matchedCase) {
          await prisma.testExecution.create({
            data: {
              testCaseId: matchedCase.id,
              status,
              actualResult: actualResult || null,
              notes: `CI 自动回流 — ${testName}`,
              executedAt: new Date(),
            },
          });
          matched++;
        } else {
          // 未匹配的创建新用例 + 执行记录
          const newCase = await prisma.testCase.create({
            data: {
              title: testName,
              steps: JSON.stringify(['CI 自动创建']),
              expectedResult: '见执行记录',
              status: 'PENDING',
              priority: 'MEDIUM',
              category: 'FUNCTIONAL',
              projectId: projectId as string,
              requirementId: null as any,
            } as any,
          });
          await prisma.testExecution.create({
            data: {
              testCaseId: newCase.id,
              status,
              actualResult: actualResult || null,
              notes: `CI 自动回流（新建用例）— ${testName}`,
              executedAt: new Date(),
            },
          });
          created++;
        }
      } catch (err: any) {
        errors.push(`${tc.name}: ${err.message}`);
      }
    }

    return NextResponse.json({
      message: 'JUnit 结果已回流',
      total: allCases.length,
      matched,
      created,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('JUnit webhook error:', error);
    return NextResponse.json({ message: `解析 JUnit XML 失败: ${error.message}` }, { status: 400 });
  }
}
