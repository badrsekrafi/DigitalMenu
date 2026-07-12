const app = require("./server/Server");

const PORT = Number(process.env.PORT || 3000);
const server = app.server || app;

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
