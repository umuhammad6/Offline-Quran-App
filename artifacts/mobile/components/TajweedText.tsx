import React from "react";
import { Text, TextStyle } from "react-native";

const TAJWEED_COLORS: Record<string, string> = {
  ham_wasl: "#AAAAAA",
  slnt: "#AAAAAA",
  laam_shamsiyah: "#AAAAAA",
  madda_normal: "#537FFF",
  madda_permissible: "#4BC8CF",
  madda_necessary: "#2144C1",
  madda_obligatory: "#2144C1",
  qalaqah: "#DD5F60",
  ikhafa_shafawi: "#D500B7",
  ikhafa: "#9400A8",
  idghaam_shafawi: "#58B800",
  idghaam_wo_ghunnah: "#169200",
  idghaam_w_ghunnah: "#169200",
  idghaam_mutajanisayn: "#A1A000",
  idghaam_mutaqaribayn: "#A1A000",
  iqlab: "#26BFFD",
  ghunnah: "#58B800",
};

interface TextSpan {
  text: string;
  color?: string;
}

function parseTajweedText(text: string): TextSpan[] {
  const spans: TextSpan[] = [];
  const regex = /<tajweed class="([^"]+)">([^<]*)<\/tajweed>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      spans.push({ text: text.slice(lastIndex, match.index) });
    }
    spans.push({
      text: match[2],
      color: TAJWEED_COLORS[match[1]] ?? undefined,
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    spans.push({ text: text.slice(lastIndex) });
  }

  return spans.length > 0 ? spans : [{ text }];
}

export function stripTajweedTags(text: string): string {
  return text.replace(/<tajweed class="[^"]+">([^<]*)<\/tajweed>/g, "$1");
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
  const spans = parseTajweedText(text);

  return (
    <Text
      style={[
        {
          fontSize,
          fontFamily,
          textAlign: "right",
          writingDirection: "rtl",
          lineHeight: fontSize * 1.9,
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
