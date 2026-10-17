// Node regression processes also render React client components. Next's build
// enforces server-only boundaries; this isolated test preloader permits imports.
const id = require.resolve('server-only');
require.cache[id] = { id, filename: id, loaded: true, exports: {} };
