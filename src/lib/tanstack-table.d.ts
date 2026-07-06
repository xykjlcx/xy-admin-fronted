import '@tanstack/react-table';
import type { RowData } from '@tanstack/react-table';

declare const columnMetaDataType: unique symbol;
declare const columnMetaValueType: unique symbol;

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    width?: string;
    align?: 'start' | 'center' | 'end';
    readonly [columnMetaDataType]?: TData;
    readonly [columnMetaValueType]?: TValue;
  }
}
