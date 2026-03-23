import { a as GitGraphGrammarGeneratedModule, f as __name, g as createDefaultSharedCoreModule, h as createDefaultCoreModule, i as CommonValueConverter, m as inject, p as EmptyFileSystem, s as MermaidGeneratedSharedModule, t as AbstractMermaidTokenBuilder } from "./chunk-XZSTWKYB-C8VQjC2D.js";
//#region node_modules/@mermaid-js/parser/dist/chunks/mermaid-parser.core/chunk-7E7YKBS2.mjs
var GitGraphTokenBuilder = class extends AbstractMermaidTokenBuilder {
	static {
		__name(this, "GitGraphTokenBuilder");
	}
	constructor() {
		super(["gitGraph"]);
	}
};
var GitGraphModule = { parser: {
	TokenBuilder: /* @__PURE__ */ __name(() => new GitGraphTokenBuilder(), "TokenBuilder"),
	ValueConverter: /* @__PURE__ */ __name(() => new CommonValueConverter(), "ValueConverter")
} };
function createGitGraphServices(context = EmptyFileSystem) {
	const shared = inject(createDefaultSharedCoreModule(context), MermaidGeneratedSharedModule);
	const GitGraph = inject(createDefaultCoreModule({ shared }), GitGraphGrammarGeneratedModule, GitGraphModule);
	shared.ServiceRegistry.register(GitGraph);
	return {
		shared,
		GitGraph
	};
}
__name(createGitGraphServices, "createGitGraphServices");
//#endregion
export { createGitGraphServices as n, GitGraphModule as t };

//# sourceMappingURL=chunk-7E7YKBS2-CFFIriQn.js.map