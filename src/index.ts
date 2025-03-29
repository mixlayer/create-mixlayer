import {
  cancel,
  confirm,
  isCancel,
  note,
  outro,
  select,
  text,
} from "@clack/prompts";
import deepmerge from "deepmerge";
import minimist from "minimist";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import color from "picocolors";
import { logger } from "rslog";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to get the templates directory path
function getTemplatesDir() {
  // Check if we're in development mode (running from source)
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    // In development, templates are in the project root
    return path.join(__dirname, "..", "templates");
  } else {
    // In production (installed via npm), templates are in node_modules
    return path.join(__dirname, "templates");
  }
}

function cancelAndExit() {
  cancel("Operation cancelled.");
  process.exit(0);
}

export function checkCancel<T>(value: unknown) {
  if (isCancel(value)) {
    cancelAndExit();
  }
  return value as T;
}

async function getTemplate() {
  const language = checkCancel<string>(
    await select({
      message: `Select language`,
      options: [
        { value: "typescript", label: "TypeScript" },
        { value: "javascript", label: "JavaScript" },
      ],
    })
  );

  return language;
}

function mixlayerCliInstallCmd() {
  if (process.platform === "darwin") {
    return "brew install mixlayer-cli";
  } else {
    //TODO: add other platforms
    return "See documentation for installation instructions";
  }
}

function isMixlayerCliInstalled() {
  try {
    execSync("mxl --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function sortObjectKeys(obj: Record<string, unknown>) {
  const sortedKeys = Object.keys(obj).sort();

  const sortedObj: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    sortedObj[key] = obj[key];
  }

  return sortedObj;
}

/**
 * Merge two package.json files and keep the order of keys.
 * @param targetPackage Path to the base package.json file
 * @param extraPackage Path to the extra package.json file to merge
 */
export function mergePackageJson(targetPackage: string, extraPackage: string) {
  if (!fs.existsSync(targetPackage)) {
    return;
  }

  const targetJson = JSON.parse(fs.readFileSync(targetPackage, "utf-8"));
  const extraJson = JSON.parse(fs.readFileSync(extraPackage, "utf-8"));
  const mergedJson: Record<string, unknown> = deepmerge(targetJson, extraJson);

  mergedJson.name = targetJson.name || extraJson.name;

  for (const key of ["scripts", "dependencies", "devDependencies"]) {
    if (!(key in mergedJson)) {
      continue;
    }
    mergedJson[key] = sortObjectKeys(
      mergedJson[key] as Record<string, unknown>
    );
  }

  fs.writeFileSync(targetPackage, `${JSON.stringify(mergedJson, null, 2)}\n`);
}

/**
 * Updates the package.json file at the specified path with the provided version and name.
 *
 * @param pkgJsonPath - The file path to the package.json file.
 * @param version - Optional. The version to update in the package.json. If not provided, version will not be updated.
 * @param name - Optional. The name to update in the package.json. If not provided, name will not be updated.
 */
const updatePackageJson = (
  pkgJsonPath: string,
  version?: string | Record<string, string>,
  name?: string
) => {
  const isStableVersion = (version: string) => {
    return ["alpha", "beta", "rc", "canary", "nightly"].every(
      (tag) => !version.includes(tag)
    );
  };

  let content = fs.readFileSync(pkgJsonPath, "utf-8");

  if (typeof version === "string") {
    // Lock the version if it is not stable
    const targetVersion = isStableVersion(version) ? `^${version}` : version;
    content = content.replace(/workspace:\*/g, targetVersion);
  }

  const pkg = JSON.parse(content);

  if (typeof version === "object") {
    for (const [name, ver] of Object.entries(version)) {
      if (pkg.dependencies?.[name]) {
        pkg.dependencies[name] = ver;
      }
      if (pkg.devDependencies?.[name]) {
        pkg.devDependencies[name] = ver;
      }
    }
  }

  if (name && name !== ".") {
    pkg.name = name;
  }

  fs.writeFileSync(pkgJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
};

/**
 * 1. Input: 'foo'
 *    Output: folder `<cwd>/foo`, `package.json#name` -> `foo`
 *
 * 2. Input: 'foo/bar'
 *    Output: folder -> `<cwd>/foo/bar` folder, `package.json#name` -> `bar`
 *
 * 3. Input: '@scope/foo'
 *    Output: folder -> `<cwd>/@scope/bar` folder, `package.json#name` -> `@scope/foo`
 *
 * 4. Input: './foo/bar'
 *    Output: folder -> `<cwd>/foo/bar` folder, `package.json#name` -> `bar`
 *
 * 5. Input: '/root/path/to/foo'
 *    Output: folder -> `'/root/path/to/foo'` folder, `package.json#name` -> `foo`
 */
function formatProjectName(input: string) {
  const formatted = input.trim().replace(/\/+$/g, "");
  return {
    packageName: formatted.startsWith("@")
      ? formatted
      : path.basename(formatted),
    targetDir: formatted,
  };
}

/**
 * Copy files from one folder to another.
 * @param from Source folder
 * @param to Destination folder
 * @param version - Optional. The version to update in the package.json. If not provided, version will not be updated.
 * @param name - Optional. The name to update in the package.json. If not provided, name will not be updated.
 * @param isMergePackageJson Merge package.json files
 * @param skipFiles Files to skip
 */
export function copyFolder({
  from,
  to,
  version,
  packageName,
  isMergePackageJson = false,
  skipFiles = [],
}: {
  from: string;
  to: string;
  version?: string | Record<string, string>;
  packageName?: string;
  isMergePackageJson?: boolean;
  skipFiles?: string[];
}) {
  const renameFiles: Record<string, string> = {
    gitignore: ".gitignore",
  };

  // Skip local files
  const allSkipFiles = ["node_modules", "dist", ...skipFiles];

  fs.mkdirSync(to, { recursive: true });

  for (const file of fs.readdirSync(from)) {
    if (allSkipFiles.includes(file)) {
      continue;
    }

    const srcFile = path.resolve(from, file);
    const distFile = renameFiles[file]
      ? path.resolve(to, renameFiles[file])
      : path.resolve(to, file);
    const stat = fs.statSync(srcFile);

    if (stat.isDirectory()) {
      copyFolder({
        from: srcFile,
        to: distFile,
        packageName,
        version,
        skipFiles,
      });
    } else if (file === "package.json") {
      const destPackageJson = path.resolve(to, "package.json");
      if (isMergePackageJson && fs.existsSync(destPackageJson)) {
        mergePackageJson(destPackageJson, srcFile);
      } else {
        fs.copyFileSync(srcFile, distFile);
        updatePackageJson(distFile, version, packageName);
      }
    } else {
      fs.copyFileSync(srcFile, distFile);
    }
  }
}

type Argv = {
  help?: boolean;
  dir?: string;
  template?: string;
  git?: boolean;
  override?: boolean;
};

function logHelpMessage(templates: string[]) {
  logger.log(`
   Usage: create-mixlayer [options]

   Options:
   
     -h, --help       display help for command
     -d, --dir        create project in specified directory   
     -t, --template   select template
     -o, --override   override existing project
     -g, --git        initialize git repository

   Templates:

     ${templates.join(", ")}
`);
}

function pkgFromUserAgent(userAgent: string | undefined) {
  if (!userAgent) return undefined;
  const pkgSpec = userAgent.split(" ")[0];
  const pkgSpecArr = pkgSpec.split("/");
  return {
    name: pkgSpecArr[0],
    version: pkgSpecArr[1],
  };
}

function isEmptyDir(path: string) {
  const files = fs.readdirSync(path);
  return files.length === 0 || (files.length === 1 && files[0] === ".git");
}

async function main() {
  const createRoot = __dirname;
  const templates = ["typescript", "javascript"];

  const argv = minimist<Argv>(process.argv.slice(2), {
    alias: { h: "help", d: "dir", t: "template" },
  });

  if (argv.help) {
    logHelpMessage(templates);
    process.exit(0);
  }

  if (!isMixlayerCliInstalled()) {
    // TODO: add platform specific install instructions
    logger.error(
      `mixlayer cli not found, please run: \n\n\t${color.bold(
        color.green(mixlayerCliInstallCmd())
      )}`
    );

    process.exit(1);
  }

  console.log("");
  logger.greet(`◆  Create Mixlayer Project`);

  const cwd = process.cwd();
  const pkgInfo = pkgFromUserAgent(process.env.npm_config_user_agent);
  const pkgManager = pkgInfo ? pkgInfo.name : "npm";
  const templatesRoot = getTemplatesDir();

  const projectName =
    argv.dir ??
    checkCancel<string>(
      await text({
        message: "Project name or path",
        placeholder: `mixlayer-project`,
        defaultValue: `mixlayer-project`,
        validate(value) {
          if (value.length === 0) {
            return "Project name is required";
          }
        },
      })
    );

  const { targetDir, packageName } = formatProjectName(projectName);

  const destFolder = path.isAbsolute(targetDir)
    ? targetDir
    : path.join(cwd, targetDir);

  if (!argv.override && fs.existsSync(destFolder) && !isEmptyDir(destFolder)) {
    const option = checkCancel<string>(
      await select({
        message: `"${targetDir}" is not empty, please choose:`,
        options: [
          { value: "yes", label: "Continue and override files" },
          { value: "no", label: "Cancel operation" },
        ],
      })
    );

    if (option === "no") {
      cancelAndExit();
    }
  }

  const template = argv.template ?? (await getTemplate());
  const templateSrcFolder = path.join(templatesRoot, `template-${template}`);
  const commonSrcFolder = path.join(templatesRoot, "common");

  copyFolder({
    from: commonSrcFolder,
    to: destFolder,
    packageName,
  });

  copyFolder({
    from: templateSrcFolder,
    to: destFolder,
    packageName,
    version: "1.0.0",
    isMergePackageJson: true,
  });

  if (!fs.existsSync(path.join(destFolder, ".git"))) {
    const installGit =
      argv.git ??
      checkCancel<string>(
        await confirm({ message: "Initialize git repository?" })
      );

    if (installGit) {
      execSync("git init", { cwd: destFolder, stdio: "ignore" });
    }
  }

  const nextSteps = [
    `1. ${color.cyan(`cd ${targetDir}`)}`,
    `2. ${color.cyan(`${pkgManager} install`)}`,
    `3. ${color.cyan(`${pkgManager} run dev`)}`,
  ];

  note(nextSteps.map((step) => color.reset(step)).join("\n"), "Next steps");

  outro("All set, happy coding!");
}

await main();
