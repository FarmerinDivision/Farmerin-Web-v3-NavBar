import React from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export const ExcelFile = ({ element, filename = 'Download', children }) => {
  const handleExport = (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    const wb = XLSX.utils.book_new();
    const sheets = React.Children.toArray(children);

    sheets.forEach((sheet) => {
      if (sheet && sheet.props) {
        const { data = [], name = 'Sheet', children: columns } = sheet.props;
        const colArray = React.Children.toArray(columns);

        const sheetData = data.map((row) => {
          const rowData = {};
          colArray.forEach((col) => {
            if (col && col.props) {
              const { label, value } = col.props;
              let cellValue = '';
              if (typeof value === 'function') {
                cellValue = value(row);
              } else if (typeof value === 'string') {
                cellValue = row[value] !== undefined && row[value] !== null ? row[value] : '';
              }
              rowData[label] = cellValue;
            }
          });
          return rowData;
        });

        const ws = XLSX.utils.json_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(wb, ws, name);
      }
    });

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });

    const fullFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    saveAs(blob, fullFilename);
  };

  if (React.isValidElement(element)) {
    return React.cloneElement(element, {
      onClick: (e) => {
        if (element.props.onClick) {
          element.props.onClick(e);
        }
        handleExport(e);
      },
    });
  }

  return (
    <span onClick={handleExport} style={{ cursor: 'pointer' }}>
      {element}
    </span>
  );
};

export const ExcelSheet = () => {
  return null;
};

export const ExcelColumn = () => {
  return null;
};

ExcelFile.ExcelSheet = ExcelSheet;
ExcelFile.ExcelColumn = ExcelColumn;

const ReactExport = {
  ExcelFile,
};

export default ReactExport;
