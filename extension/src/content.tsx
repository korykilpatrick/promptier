import cssText from "data-text:~style.css";
import type { PlasmoCSConfig } from "plasmo";
import { CountButton } from "~features/count-button";

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
};

export const getStyle = (): HTMLStyleElement => {
  const baseFontSize = 16;
  let updatedCssText = cssText.replaceAll(":root", ":host(plasmo-csui)");
  const remRegex = /([\d.]+)rem/g;
  updatedCssText = updatedCssText.replace(remRegex, (match, remValue) => {
    const pixelsValue = parseFloat(remValue) * baseFontSize;
    return `${pixelsValue}px`;
  });

  const styleElement = document.createElement("style");
  styleElement.textContent = updatedCssText;
  return styleElement;
};

const PlasmoOverlay = () => {
  return (
    <div className="plasmo-z-50 plasmo-flex plasmo-fixed plasmo-top-32 plasmo-right-8">
      <CountButton />
    </div>
  );
};

export default PlasmoOverlay;