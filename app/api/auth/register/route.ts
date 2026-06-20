/**
 * 用户注册 API
 *
 * POST /api/auth/register
 * Body: { name?, email, password }
 * 创建用户（密码 bcrypt 加密）后返回成功，不自动登录。
 */

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/../lib/prisma';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    // 校验
    if (!email || !password) {
      return NextResponse.json({ message: '邮箱和密码为必填项' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ message: '邮箱格式不正确' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ message: '密码至少需要 6 个字符' }, { status: 400 });
    }

    // 检查是否已存在
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ message: '该邮箱已被注册' }, { status: 409 });
    }

    // 创建用户
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name: name || email.split('@')[0],
        email,
        passwordHash,
      },
    });

    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        message: '注册成功',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ message: '注册失败，请稍后重试' }, { status: 500 });
  }
}
