import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import { Root, Content, Code } from 'mdast';

/**
 * Extracts the first JSON code block from markdown content.
 * Returns the parsed JSON object, or throws if not found/invalid.
 */
export function extractJsonFromMarkdown(markdown: string): Record<string, unknown> {
  const tree = unified().use(remarkParse).parse(markdown) as Root;

  let jsonString: string | null = null;

  visit(tree, 'code', (node: Content) => {
    const codeNode = node as Code;
    if (codeNode.lang && codeNode.lang.toLowerCase() === 'json' && !jsonString) {
      jsonString = codeNode.value;
    }
  });

  if (!jsonString) {
    throw new Error('No JSON code block found in markdown.');
  }

  try {
    return JSON.parse(jsonString);
  } catch (e) {
    throw new Error('Invalid JSON in code block: ' + e);
  }
} 