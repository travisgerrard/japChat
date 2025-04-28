import TinySegmenter from 'tiny-segmenter';

const segmenter = new TinySegmenter();

export function tokenizeWords(sentence: string): string[] {
  return segmenter.segment(sentence);
} 