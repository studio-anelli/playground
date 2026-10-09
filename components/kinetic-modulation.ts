type ModulationPatch<T extends string> = { target: T; wave: number; amount: number };
/** Index cables once per frame, preserving their order and exact arithmetic. */
export function indexModulation<T extends string>(targets: readonly T[], patches: readonly ModulationPatch<T>[]) {
  const indexed = Object.fromEntries(targets.map(target => [target, []])) as unknown as Record<T, ModulationPatch<T>[]>;
  for (const patch of patches) indexed[patch.target].push(patch);
  return indexed;
}
