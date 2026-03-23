import { H as __name, U as log } from "./src-B8i2ibtT.js";
import { s as common_default, y as getConfig } from "./chunk-7R4GIKGN-DJe7fpaf.js";
import { u as interpolateToCurve } from "./chunk-GEFDOKGD-4aCEMfCa.js";
import { a as insertNode, i as insertCluster, s as labelHelper } from "./chunk-KYZI473N-5ygG2Q6g.js";
import { a as positionEdgeLabel, i as markers_default, n as insertEdge, r as insertEdgeLabel } from "./chunk-O4XLMI2P-00z80fb-.js";
//#region node_modules/mermaid/dist/chunks/mermaid.core/chunk-GLR3WWYH.mjs
var internalHelpers = {
	common: common_default,
	getConfig,
	insertCluster,
	insertEdge,
	insertEdgeLabel,
	insertMarkers: markers_default,
	insertNode,
	interpolateToCurve,
	labelHelper,
	log,
	positionEdgeLabel
};
var layoutAlgorithms = {};
var registerLayoutLoaders = /* @__PURE__ */ __name((loaders) => {
	for (const loader of loaders) layoutAlgorithms[loader.name] = loader;
}, "registerLayoutLoaders");
(/* @__PURE__ */ __name(() => {
	registerLayoutLoaders([{
		name: "dagre",
		loader: /* @__PURE__ */ __name(async () => await import("./dagre-KLK3FWXG-jxEPBrvS.js"), "loader")
	}, ...[{
		name: "cose-bilkent",
		loader: /* @__PURE__ */ __name(async () => await import("./cose-bilkent-S5V4N54A-C-b7tjyi.js"), "loader")
	}]]);
}, "registerDefaultLayoutLoaders"))();
var render = /* @__PURE__ */ __name(async (data4Layout, svg) => {
	if (!(data4Layout.layoutAlgorithm in layoutAlgorithms)) throw new Error(`Unknown layout algorithm: ${data4Layout.layoutAlgorithm}`);
	const layoutDefinition = layoutAlgorithms[data4Layout.layoutAlgorithm];
	return (await layoutDefinition.loader()).render(data4Layout, svg, internalHelpers, { algorithm: layoutDefinition.algorithm });
}, "render");
var getRegisteredLayoutAlgorithm = /* @__PURE__ */ __name((algorithm = "", { fallback = "dagre" } = {}) => {
	if (algorithm in layoutAlgorithms) return algorithm;
	if (fallback in layoutAlgorithms) {
		log.warn(`Layout algorithm ${algorithm} is not registered. Using ${fallback} as fallback.`);
		return fallback;
	}
	throw new Error(`Both layout algorithms ${algorithm} and ${fallback} are not registered.`);
}, "getRegisteredLayoutAlgorithm");
//#endregion
export { registerLayoutLoaders as n, render as r, getRegisteredLayoutAlgorithm as t };

//# sourceMappingURL=chunk-GLR3WWYH-DvUtsoPS.js.map