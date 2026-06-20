/**
 * 团队版 Agent 的「相似需求」检索器（替代桌面版的向量库）。
 *
 * 不依赖向量库：基于词元重叠（Jaccard）在【同一项目】内检索其它需求，
 * 返回 AgentOrchestrator QA 阶段消费的形状：
 *   { id, content, metadata: { title }, similarity }
 * 暴露与 vectorDB 相同的 { search, addDocument } 接口，可直接注入编排器。
 */

type PrismaLike = any;

function tokenize(text: string): Set<string> {
  return new Set(
    (text || '')
      .toLowerCase()
      // 按非字母数字、非中日韩统一表意文字切分
      .split(/[^a-z0-9一-龥]+/)
      .filter((t) => t.length >= 2),
  );
}

export function makeRequirementRetriever(
  prisma: PrismaLike,
  projectId: string,
  excludeRequirementId?: string,
) {
  return {
    /** 在同项目内按词元重叠检索最相似的若干需求 */
    async search(query: string, topK = 5) {
      const qTokens = tokenize(query);
      if (qTokens.size === 0) return [];

      const rows = await prisma.requirement.findMany({
        where: {
          projectId,
          ...(excludeRequirementId ? { id: { not: excludeRequirementId } } : {}),
        },
        select: { id: true, title: true, description: true },
      });

      return rows
        .map((r: any) => {
          const rTokens = tokenize(`${r.title} ${r.description || ''}`);
          let inter = 0;
          for (const t of qTokens) if (rTokens.has(t)) inter++;
          const union = qTokens.size + rTokens.size - inter;
          return {
            id: r.id,
            content: `${r.title}\n${r.description || ''}`.trim(),
            metadata: { title: r.title, requirementId: r.id },
            similarity: union > 0 ? inter / union : 0,
          };
        })
        .filter((s: any) => s.similarity > 0)
        .sort((a: any, b: any) => b.similarity - a.similarity)
        .slice(0, topK);
    },

    /** 团队版按需实时查询，无需维护索引 */
    async addDocument() {
      /* no-op */
    },
  };
}
