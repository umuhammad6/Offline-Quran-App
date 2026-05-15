import React from "react";
import { Text, TextStyle } from "react-native";

// The quran-tajweed edition uses bracket notation: [ruleCode[chars]
// e.g. "[h:1[ٱ]" means the char "ٱ" has rule "h" (hamza wasl)
const BASE_COLOR: Record<string, string> = {
  h: "#AAAAAA", // Hamzah Wasl — silent
  l: "#AAAAAA", // Lam Shamsiyya — assimilated
  n: "#58B800", // Ghunna — nasalization (noon/meem mushaddad)
  p: "#169200", // Idghaam with Ghunna
  m: "#26BFFD", // Iqlab
  q: "#DD5F60", // Qalqala
  s: "#D500B7", // Silah
  u: "#537FFF", // Madd Normal (2 counts)
  f: "#4BC8CF", // Madd Munfasil
  k: "#2144C1", // Madd Muttasil
  w: "#A1A000", // Idghaam Mutajanisayn
  y: "#A1A000", // Idghaam Mutaqaribayn
  x: "#58B800", // Idghaam Shafawi
  a: "#D500B7", // Ikhfa Shafawi
  i: "#9400A8", // Ikhfa
  g: "#58B800", // Ghunna
};

export const TAJWEED_RULE_LABELS: Record<string, string> = {
  h: "Hamzah Wasl",
  l: "Lam Shamsiyya",
  n: "Ghunna",
  p: "Idghaam (with Ghunna)",
  m: "Iqlab",
  q: "Qalqala",
  s: "Silah",
  u: "Madd Normal",
  f: "Madd Munfasil",
  k: "Madd Muttasil",
  w: "Idghaam Mutajanisayn",
  y: "Idghaam Mutaqaribayn",
  x: "Idghaam Shafawi",
  a: "Ikhfa Shafawi",
  i: "Ikhfa",
  g: "Ghunna",
};

export const TAJWEED_RULE_DESCRIPTIONS: Record<string, string> = {
  h: "A silent alif that is not pronounced when starting in the middle of speech",
  l: "The lam in ال is assimilated into the following sun letter",
  n: "Heavy nasalization (2 counts) on shadda noon or meem",
  p: "Noon sakinah merges into the next letter with nasalization (2 counts)",
  m: "Noon sakinah is converted to a meem sound with ghunna",
  q: "An echoing bouncing sound on ق ط ب ج د",
  s: "A connecting vowel extending the end of a word",
  u: "2-count elongation on a madd letter",
  f: "Natural 2–5 count elongation before a hamza in the next word",
  k: "Necessary 4–5 count elongation before hamza in the same word",
  w: "Two letters of similar articulation merge together",
  y: "Two letters of near articulation merge together",
  x: "Meem sakinah merges into a following meem",
  a: "Meem sakinah is concealed before ba with ghunna",
  i: "Noon sakinah is concealed before 15 letters with ghunna",
  g: "Nasalization sound held for 2 counts",
};

interface TextSpan {
  text: string;
  color?: string;
}

function parseTajweedBracket(text: string): TextSpan[] {
  const spans: TextSpan[] = [];
  // Format: [ruleCode[chars]  e.g. [h:1[ٱ] or [l[ل]
  const regex = /\[([^\[]+)\[([^\]]*)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      spans.push({ text: text.slice(lastIndex, match.index) });
    }
    const ruleRaw = match[1]; // e.g. "h:1" or "l"
    const baseCode = ruleRaw.split(":")[0]; // just "h" or "l"
    const chars = match[2];
    spans.push({
      text: chars,
      color: BASE_COLOR[baseCode] ?? undefined,
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    spans.push({ text: text.slice(lastIndex) });
  }

  return spans.length > 0 ? spans : [{ text }];
}

export function stripTajweedTags(text: string): string {
  return text.replace(/\[([^\[]+)\[([^\]]*)\]/g, "$2");
}

interface TajweedTextProps {
  text: string;
  fontSize: number;
  fontFamily?: string;
  color: string;
  style?: TextStyle;
}

export default function TajweedText({
  text,
  fontSize,
  fontFamily,
  color,
  style,
}: TajweedTextProps) {
  const spans = parseTajweedBracket(text);

  return (
    <Text
      style={[
        {
          fontSize,
          fontFamily,
          textAlign: "right",
          writingDirection: "rtl",
          lineHeight: fontSize * 2.0,
        },
        style,
      ]}
    >
      {spans.map((span, i) => (
        <Text key={i} style={{ color: span.color ?? color }}>
          {span.text}
        </Text>
      ))}
    </Text>
  );
}
