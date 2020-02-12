import buble from '@rollup/plugin-buble';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';


const version = process.env.VERSION || require('./package.json').version

const banner =
  '/*!\n' +
  ' * wgl v' + version + '\n' +
  ' * (c) 2017-2020 Andrei Kashcha.\n' +
  ' * Released under the MIT License.\n' +
  ' */'
export default {
  input: 'index.js',
  plugins: [
		resolve(),
		commonjs(),
		buble()
	],
  output: [{
      format: 'umd',
      name: 'wgl',
      file: 'build/wgl.js',
      sourcemap: true,
      banner
    },
    {
      format: 'es',
      file: 'build/wgl.module.js'
    }
	],
}