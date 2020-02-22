import alias from '@rollup/plugin-alias';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';

// `npm run build` -> `production` is true
// `npm run dev` -> `production` is false
const production = !process.env.ROLLUP_WATCH;

export default {
	input: './index.js',
	output: {
		file: './bundle.js',
		format: 'iife', 
		sourcemap: true
	},
	plugins: [
    alias({
      entries: [{find: 'w-gl', replacement: '../../index.js' }]
    }),
		resolve(), 
		commonjs(),
		production && terser() // minify, but only in production
	]
};