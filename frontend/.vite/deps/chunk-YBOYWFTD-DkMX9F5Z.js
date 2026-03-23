import { H as __name } from "./src-B8i2ibtT.js";
import { b as getConfig2, d as defaultConfig_default } from "./chunk-7R4GIKGN-DJe7fpaf.js";
import { f as parseFontSize } from "./chunk-GEFDOKGD-4aCEMfCa.js";
//#region node_modules/mermaid/dist/chunks/mermaid.core/chunk-YBOYWFTD.mjs
var getSubGraphTitleMargins = /* @__PURE__ */ __name(({ flowchart }) => {
	const subGraphTitleTopMargin = flowchart?.subGraphTitleMargin?.top ?? 0;
	const subGraphTitleBottomMargin = flowchart?.subGraphTitleMargin?.bottom ?? 0;
	return {
		subGraphTitleTopMargin,
		subGraphTitleBottomMargin,
		subGraphTitleTotalMargin: subGraphTitleTopMargin + subGraphTitleBottomMargin
	};
}, "getSubGraphTitleMargins");
async function configureLabelImages(container, labelText) {
	const images = container.getElementsByTagName("img");
	if (!images || images.length === 0) return;
	const noImgText = labelText.replace(/<img[^>]*>/g, "").trim() === "";
	await Promise.all([...images].map((img) => new Promise((res) => {
		function setupImage() {
			img.style.display = "flex";
			img.style.flexDirection = "column";
			if (noImgText) {
				const bodyFontSize = getConfig2().fontSize ? getConfig2().fontSize : window.getComputedStyle(document.body).fontSize;
				const enlargingFactor = 5;
				const [parsedBodyFontSize = defaultConfig_default.fontSize] = parseFontSize(bodyFontSize);
				const width = parsedBodyFontSize * enlargingFactor + "px";
				img.style.minWidth = width;
				img.style.maxWidth = width;
			} else img.style.width = "100%";
			res(img);
		}
		__name(setupImage, "setupImage");
		setTimeout(() => {
			if (img.complete) setupImage();
		});
		img.addEventListener("error", setupImage);
		img.addEventListener("load", setupImage);
	})));
}
__name(configureLabelImages, "configureLabelImages");
//#endregion
export { getSubGraphTitleMargins as n, configureLabelImages as t };

//# sourceMappingURL=chunk-YBOYWFTD-DkMX9F5Z.js.map