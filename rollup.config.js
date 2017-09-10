const buble = require('rollup-plugin-buble');
const cjs = require('rollup-plugin-commonjs');
const node = require('rollup-plugin-node-resolve');

const version = process.env.VERSION || require('./package.json').version

const banner =
  '/*!\n' +
  ' * wgl v' + version + '\n' +
  ' * (c) 2017 Andrei Kashcha.\n' +
  ' * Released under the MIT License.\n' +
  ' */'
export default {
  input: 'index.js',
  plugins: [
		node(),
		cjs(),
		buble()
	],
  sourcemap: true,
  output: [{
      format: 'umd',
      name: 'wgl',
      file: 'build/wgl.js'
    },
    {
      format: 'es',
      file: 'build/wgl.module.js'
    }
	],
	banner
}