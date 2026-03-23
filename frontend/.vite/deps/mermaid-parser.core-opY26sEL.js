import { f as __name } from "./chunk-XZSTWKYB-C8VQjC2D.js";
//#region node_modules/@mermaid-js/parser/dist/mermaid-parser.core.mjs
var parsers = {};
var initializers = {
	info: /* @__PURE__ */ __name(async () => {
		const { createInfoServices: createInfoServices2 } = await import("./info-3K5VOQVL-thxSopC_.js");
		parsers.info = createInfoServices2().Info.parser.LangiumParser;
	}, "info"),
	packet: /* @__PURE__ */ __name(async () => {
		const { createPacketServices: createPacketServices2 } = await import("./packet-RMMSAZCW-BwDUG2Bf.js");
		parsers.packet = createPacketServices2().Packet.parser.LangiumParser;
	}, "packet"),
	pie: /* @__PURE__ */ __name(async () => {
		const { createPieServices: createPieServices2 } = await import("./pie-UPGHQEXC-_aeiXYDn.js");
		parsers.pie = createPieServices2().Pie.parser.LangiumParser;
	}, "pie"),
	architecture: /* @__PURE__ */ __name(async () => {
		const { createArchitectureServices: createArchitectureServices2 } = await import("./architecture-PBZL5I3N-YqB91R5I.js");
		parsers.architecture = createArchitectureServices2().Architecture.parser.LangiumParser;
	}, "architecture"),
	gitGraph: /* @__PURE__ */ __name(async () => {
		const { createGitGraphServices: createGitGraphServices2 } = await import("./gitGraph-HDMCJU4V-D5x-V4GD.js");
		parsers.gitGraph = createGitGraphServices2().GitGraph.parser.LangiumParser;
	}, "gitGraph"),
	radar: /* @__PURE__ */ __name(async () => {
		const { createRadarServices: createRadarServices2 } = await import("./radar-KQ55EAFF-CReUUYtZ.js");
		parsers.radar = createRadarServices2().Radar.parser.LangiumParser;
	}, "radar"),
	treemap: /* @__PURE__ */ __name(async () => {
		const { createTreemapServices: createTreemapServices2 } = await import("./treemap-KZPCXAKY-Dguul3TB.js");
		parsers.treemap = createTreemapServices2().Treemap.parser.LangiumParser;
	}, "treemap")
};
async function parse(diagramType, text) {
	const initializer = initializers[diagramType];
	if (!initializer) throw new Error(`Unknown diagram type: ${diagramType}`);
	if (!parsers[diagramType]) await initializer();
	const result = parsers[diagramType].parse(text);
	if (result.lexerErrors.length > 0 || result.parserErrors.length > 0) throw new MermaidParseError(result);
	return result.value;
}
__name(parse, "parse");
var MermaidParseError = class extends Error {
	constructor(result) {
		const lexerErrors = result.lexerErrors.map((err) => {
			return `Lexer error on line ${err.line !== void 0 && !isNaN(err.line) ? err.line : "?"}, column ${err.column !== void 0 && !isNaN(err.column) ? err.column : "?"}: ${err.message}`;
		}).join("\n");
		const parserErrors = result.parserErrors.map((err) => {
			return `Parse error on line ${err.token.startLine !== void 0 && !isNaN(err.token.startLine) ? err.token.startLine : "?"}, column ${err.token.startColumn !== void 0 && !isNaN(err.token.startColumn) ? err.token.startColumn : "?"}: ${err.message}`;
		}).join("\n");
		super(`Parsing failed: ${lexerErrors} ${parserErrors}`);
		this.result = result;
	}
	static {
		__name(this, "MermaidParseError");
	}
};
//#endregion
export { parse as t };

//# sourceMappingURL=mermaid-parser.core-opY26sEL.js.map