export default function epsilon(value: number) {
  return Math.abs(value) < 1e-10 ? 0 : value;
}