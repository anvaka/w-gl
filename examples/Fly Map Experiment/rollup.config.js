import buble from '@rollup/plugin-buble';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';


export default {
  input: 'makeLayout.js',
  plugins: [
		resolve(),
		commonjs(),
		buble()
	],
  output: [{
      format: 'umd',
      name: 'layout',
      file: 'layout.js',
      sourcemap: true,
    }
	],
}