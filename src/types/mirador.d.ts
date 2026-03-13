declare module "mirador" {
  interface MiradorInstance {
    unmount(): void;
  }

  interface MiradorStatic {
    viewer(config: Record<string, unknown>): MiradorInstance;
  }

  const mirador: MiradorStatic;
  export default mirador;
}
