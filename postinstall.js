const { spawn } = require("child_process");
const nodeify = spawn("./node_modules/.bin/rn-nodeify", [
	"--install",
	"crypto,fs,os,path,util,url,http,https,stream,zlib",
	"--hack",
]);

nodeify.stdout.on("data", (data) => {
	console.log(`${data}`);
});

const patchPackage = spawn("patch-package", []);
patchPackage.stdout.on("data", (data) => {
	console.log(`${data}`);
});

const { globSync } = require("glob");
const fs = require("fs");

const found = globSync("node_modules/@metaplex-foundation/**/*.{ts,js}");

found.forEach((file) => {
	console.log("file", file);
	if (fs.statSync(file).isFile()) {
		const data = fs.readFileSync(file, "utf8");

		const result = data.replace(
			/@metaplex-foundation\/umi\/serializers/g,
			"@metaplex-foundation/umi-serializers"
		);

		fs.writeFileSync(file, result, "utf8");
	}
});

/* Fix for serum */
// cd ts && yarn && yarn run build:browser

// const fileToPatch = "./anchor-0.24.2/ts/rollup.config.ts";

// fs.readFile(fileToPatch, "utf8", function (err, data) {
//   if (err) {
//     return console.log(err);
//   }
//   var result = data.replace(/terser\(\),/g, "");

//   fs.writeFile(fileToPatch, result, "utf8", function (err) {
//     if (err) return console.log(err);
//   });
// });

// const deleteBrowserDist = spawn("rm", [
//   "-rf",
//   "./node_modules/@project-serum/anchor/dist",
// ]);
// deleteBrowserDist.stdout.on("data", (data) => {
//   console.log(`${data}`);
// });

// const copyBrowserDist = spawn("cp", [
//   "-R",
//   "./anchor-0.24.2/dist",
//   "./node_modules/@project-serum/anchor",
// ]);
// copyBrowserDist.stdout.on("data", (data) => {
// 	console.log(`${data}`);
// });
