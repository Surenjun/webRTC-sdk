import typescript from "@rollup/plugin-typescript";
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import builtins from 'rollup-plugin-node-builtins';

const config = {
    input: 'src/main.ts',
    output: {
        file: 'dist/index.js',
        format: 'cjs',
        entryFileNames: '[name].cjs.js',
        sourcemap: false
    },
    plugins: [
        builtins(),
        commonjs({include: /node_modules/}),
        resolve({ browser: true}),
        typescript({tsconfig: './tsconfig.json'})
    ],
    }

export default config;
