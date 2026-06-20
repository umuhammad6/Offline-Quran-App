import React, { useContext } from "react";
import { Text, TextStyle } from "react-native";
import { TajweedContext } from "@/context/TajweedContext";
import {
  TAJWEED_RULE_COLORS,
  TAJWEED_RULE_DESCRIPTIONS,
  TAJWEED_RULE_LABELS,
} from "@/constants/tajweed";

export { TAJWEED_RULE_LABELS, TAJWEED_RULE_DESCRIPTIONS, TAJWEED_RULE_COLORS };

interface TextSpan {
  text: string;
  ruleCode?: string;
}

function parseTajweedBracket(text: string): TextSpan[] {
  const spans: TextSpan[] = [];
  const regex = /\[([^\[]+)\[([^\]]*)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      spans.push({ text: text.slice(lastIndex, match.index) });
    }
    const ruleRaw = match[1];
    const baseCode = ruleRaw.split(":")[0];
    const chars = match[2];
    spans.push({ text: chars, ruleCode: baseCode });
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
  const { isRuleEnabled } = useContext(TajweedContext);
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
      {spans.map((span, i) => {
        const ruleColor =
          span.ruleCode && isRuleEnabled(span.ruleCode)
            ? TAJWEED_RULE_COLORS[span.ruleCode]
            : undefined;
        return (
          <Text key={i} style={{ color: ruleColor ?? color }}>
            {span.text}
          </Text>
        );
      })}
    </Text>
  );
}
