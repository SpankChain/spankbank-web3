import * as ts from 'typescript';
interface MethodCall {
    name: string;
    args: Array<{
        name: string;
        type: string;
    }>;
    returnType: string;
    call: string;
}
export declare function findSmartContractMethodDefinitions(sourceFile: ts.SourceFile, targetClassName: string): MethodCall[];
export declare function loadSourceFile(name: string): ts.SourceFile;
export {};
