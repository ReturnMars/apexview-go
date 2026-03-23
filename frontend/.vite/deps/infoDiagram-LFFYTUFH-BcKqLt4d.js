import { H as __name, U as log } from "./src-B8i2ibtT.js";
import { c as configureSvgSize } from "./chunk-7R4GIKGN-DJe7fpaf.js";
import { t as selectSvgElement } from "./chunk-HHEYEP7N-BBwDeGWd.js";
import "./merge-C0H0l7Bj.js";
import "./chunk-XZSTWKYB-C8VQjC2D.js";
import "./lodash-DDY-q-sT.js";
import "./chunk-R5LLSJPH-DcD1ISKp.js";
import "./chunk-7E7YKBS2-CFFIriQn.js";
import "./chunk-EGIJ26TM-BogQb0Vq.js";
import "./chunk-C72U2L5F-CxhPltUp.js";
import "./chunk-XIRO2GV7-CDqwAx96.js";
import "./chunk-L3YUKLVL-eS537T5w.js";
import "./chunk-OZEHJAEY-Bj17LuIj.js";
import { t as parse } from "./mermaid-parser.core-opY26sEL.js";
//#region node_modules/mermaid/dist/chunks/mermaid.core/infoDiagram-LFFYTUFH.mjs
var parser = { parse: /* @__PURE__ */ __name(async (input) => {
	const ast = await parse("info", input);
	log.debug(ast);
}, "parse") };
var DEFAULT_INFO_DB = { version: "11.13.0" };
var diagram = {
	parser,
	db: { getVersion: /* @__PURE__ */ __name(() => DEFAULT_INFO_DB.version, "getVersion") },
	renderer: { draw: /* @__PURE__ */ __name((text, id, version) => {
		log.debug("rendering info diagram\n" + text);
		const svg = selectSvgElement(id);
		configureSvgSize(svg, 100, 400, true);
		svg.append("g").append("text").attr("x", 100).attr("y", 40).attr("class", "version").attr("font-size", 32).style("text-anchor", "middle").text(`v${version}`);
	}, "draw") }
};
//#endregion
export { diagram };

//# sourceMappingURL=infoDiagram-LFFYTUFH-BcKqLt4d.js.map