import { B as select_default, H as __name } from "./src-B8i2ibtT.js";
import { b as getConfig2 } from "./chunk-7R4GIKGN-DJe7fpaf.js";
//#region node_modules/mermaid/dist/chunks/mermaid.core/chunk-HHEYEP7N.mjs
var selectSvgElement = /* @__PURE__ */ __name((id) => {
	const { securityLevel } = getConfig2();
	let root = select_default("body");
	if (securityLevel === "sandbox") root = select_default((select_default(`#i${id}`).node()?.contentDocument ?? document).body);
	return root.select(`#${id}`);
}, "selectSvgElement");
//#endregion
export { selectSvgElement as t };

//# sourceMappingURL=chunk-HHEYEP7N-BBwDeGWd.js.map