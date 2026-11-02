import neo4j, { Driver } from 'neo4j-driver';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiKey } from './ingest.js';

let driver: Driver | null = null;

function getDriver(): Driver | null {
  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !username || !password) {
    return null;
  }

  if (!driver) {
    driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  }
  return driver;
}

const CYPHER_PROMPT = `You are a Neo4j Cypher expert. Write ONE Cypher query to answer the question.

Schema:
Node labels: {labels}
Relationship types: {relationships}

Important direction rules for this graph:
- "downstream of X" means equipment X FEEDS or is UPSTREAM_OF -> follow (X)-[:FEEDS|UPSTREAM_OF]->(result)
- "upstream of X" means -> follow (X)-[:DOWNSTREAM_OF]->(result) OR (result)-[:FEEDS]->(X)
- "what protects X" -> (X)-[:PROTECTED_BY]->(result)
- Technicians: the arrow is (Workorder)-[:PERFORMED_BY]->(Technician). To count work per technician:
  MATCH (w:Workorder)-[:PERFORMED_BY]->(t:Technician) RETURN t.id, count(w) AS cnt ORDER BY cnt DESC
- Equipment tags look like 'P-101', 'T-201'. Work orders look like 'Wo-2024-0455'.
- Only use relationship types and directions that exist in the schema.

Return ONLY the Cypher query, no explanation, no markdown fences.

Question: {question}
Cypher:`;

export async function getSummary(): Promise<{
  available: boolean;
  nodes?: number;
  relationships?: number;
  error?: string;
}> {
  try {
    const d = getDriver();
    if (!d) {
      return { available: false, error: 'Neo4j credentials not configured in .env' };
    }

    const session = d.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
    try {
      const nodeResult = await session.run('MATCH (n) RETURN count(n) AS c');
      const relResult = await session.run('MATCH ()-[r]->() RETURN count(r) AS c');

      const nodes = nodeResult.records[0]?.get('c')?.toNumber?.() ?? Number(nodeResult.records[0]?.get('c') || 0);
      const relationships = relResult.records[0]?.get('c')?.toNumber?.() ?? Number(relResult.records[0]?.get('c') || 0);

      return { available: true, nodes, relationships };
    } finally {
      await session.close();
    }
  } catch (err: any) {
    return { available: false, error: err?.message || String(err) };
  }
}

export async function askGraph(
  question: string,
  apiKey?: string
): Promise<{ result?: any; error?: string }> {
  try {
    const d = getDriver();
    if (!d) {
      return { error: 'Neo4j is not configured. Set NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD in .env.' };
    }

    const session = d.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
    try {
      const labelsRes = await session.run('CALL db.labels()');
      const relsRes = await session.run('CALL db.relationshipTypes()');

      const labels = labelsRes.records.map((r) => r.get(0)).join(', ');
      const relationships = relsRes.records.map((r) => r.get(0)).join(', ');

      const prompt = CYPHER_PROMPT
        .replace('{labels}', labels || 'Equipment, Workorder, Technician')
        .replace('{relationships}', relationships || 'FEEDS, UPSTREAM_OF, DOWNSTREAM_OF, PROTECTED_BY, PERFORMED_BY')
        .replace('{question}', question);

      const key = getGeminiKey(apiKey);
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: { temperature: 0 }
      });

      const response = await model.generateContent(prompt);
      let cypher = response.response.text().trim();
      cypher = cypher.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim();

      const queryRes = await session.run(cypher);
      const records = queryRes.records.map((rec) => rec.toObject());

      return { result: records };
    } finally {
      await session.close();
    }
  } catch (err: any) {
    return { error: err?.message || String(err) };
  }
}

