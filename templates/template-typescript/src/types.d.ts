declare module "*.txt" {
  const content: string;
  export default content;
}

const process: {
  env: ProcessEnv;
};
