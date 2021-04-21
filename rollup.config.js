import buble from '@rollup/plugin-buble';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import ts from 'rollup-plugin-typescript2'
import path from 'path';


const version = process.env.VERSION || require('./package.json').version
console.log('path ',
      path.resolve(__dirname, 'tsconfig.json')
)

const banner =
  '/*!\n' +
  ' * wgl v' + version + '\n' +
  ' * (c) 2017-2021 Andrei Kashcha.\n' +
  ' * Released under the MIT License.\n' +
  ' */'
export default {
  input: 'index.ts',
  plugins: [
    ts({
      check: true,
      tsconfig: path.resolve(__dirname, 'tsconfig.json'),
      tsconfigOverride: {
        compilerOptions: {
          sourceMap: true,
          declaration: true,
          declarationMap: true
        }
      },
    }),
		resolve(),
		commonjs(),
    buble()
	],
  output: [
    {
      format: 'umd',
      name: 'wgl',
      file: 'build/wgl.js',
      sourcemap: true,
      // dir: 'build',
      banner
    },
    {
      format: 'es',
      file: 'build/wgl.module.js',
      sourcemap: true,
    }
	],
}
