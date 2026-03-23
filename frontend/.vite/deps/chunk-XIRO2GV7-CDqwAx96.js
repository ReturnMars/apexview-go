import { f as __name, g as createDefaultSharedCoreModule, h as createDefaultCoreModule, l as PieGrammarGeneratedModule, m as inject, n as AbstractMermaidValueConverter, p as EmptyFileSystem, s as MermaidGeneratedSharedModule, t as AbstractMermaidTokenBuilder } from "./chunk-XZSTWKYB-C8VQjC2D.js";
//#region node_modules/@mermaid-js/parser/dist/chunks/mermaid-parser.core/chunk-XIRO2GV7.mjs
var PieTokenBuilder = class extends AbstractMermaidTokenBuilder {
	static {
		__name(this, "PieTokenBuilder");
	}
	constructor() {
		super(["pie", "showData"]);
	}
};
var PieValueConverter = class extends AbstractMermaidValueConverter {
	static {
		__name(this, "PieValueConverter");
	}
	runCustomConverter(rule, input, _cstNode) {
		if (rule.name !== "PIE_SECTION_LABEL") return;
		return input.replace(/"/g, "").trim();
	}
};
var PieModule = { parser: {
	TokenBuilder: /* @__PURE__ */ __name(() => new PieTokenBuilder(), "TokenBuilder"),
	ValueConverter: /* @__PURE__ */ __name(() => new PieValueConverter(), "ValueConverter")
} };
function createPieServices(context = EmptyFileSystem) {
	const shared = inject(createDefaultSharedCoreModule(context), MermaidGeneratedSharedModule);
	const Pie = inject(createDefaultCoreModule({ shared }), PieGrammarGeneratedModule, PieModule);
	shared.ServiceRegistry.register(Pie);
	return {
		shared,
		Pie
	};
}
__name(createPieServices, "createPieServices");
//#endregion
export { createPieServices as n, PieModule as t };

//# sourceMappingURL=chunk-XIRO2GV7-CDqwAx96.js.map