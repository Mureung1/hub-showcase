import { useEffect } from "react";

import App from "../App.tsx";
import {
  translateEnglishAttribute,
  translateEnglishText,
  translateEnglishTree,
} from "./translateEnglish";

const LOCALIZED_ATTRIBUTES = ["aria-label", "placeholder", "title"] as const;

function translateElementAttributes(element: Element) {
  for (const attribute of LOCALIZED_ATTRIBUTES) {
    const value = element.getAttribute(attribute);
    if (!value) continue;
    const translated = translateEnglishAttribute(value);
    if (translated !== value) element.setAttribute(attribute, translated);
  }
}

export function EnglishApp() {
  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return undefined;

    const previousLanguage = document.documentElement.lang;
    const previousTitle = document.title;
    document.documentElement.lang = "en";
    document.documentElement.classList.add("is-english");
    document.title = "LocalTwin | Market analysis";
    translateEnglishTree(root);
    root.querySelectorAll("*").forEach(translateElementAttributes);

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "characterData") {
          const textNode = record.target;
          const value = textNode.textContent ?? "";
          const translated = translateEnglishText(value);
          if (translated !== value) textNode.textContent = translated;
          continue;
        }
        if (record.type === "attributes" && record.target instanceof Element) {
          translateElementAttributes(record.target);
          continue;
        }
        record.addedNodes.forEach((node) => {
          translateEnglishTree(node);
          if (node instanceof Element) {
            translateElementAttributes(node);
            node.querySelectorAll("*").forEach(translateElementAttributes);
          }
        });
      }
    });

    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...LOCALIZED_ATTRIBUTES],
    });

    return () => {
      observer.disconnect();
      document.documentElement.lang = previousLanguage;
      document.documentElement.classList.remove("is-english");
      document.title = previousTitle;
    };
  }, []);

  return <App useDemoData />;
}
