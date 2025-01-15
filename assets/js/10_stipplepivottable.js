(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global["st-pivottable"] = factory());
})(this, (function () { 'use strict';

  window.functionCallCounter = {
    constructor: 0,
    process: 0,
    generatePivotStructure: 0,
    sortColumnValues: 0,
    calculateAverage: 0,
    generateRowHierarchy: 0,
    mapToArray: 0,
    groupByParent: 0,
    sortGroup: 0,
    sortByLevel: 0,
    sortNodes: 0,
    finalizeNode: 0,
    processRow: 0,
    flattenRows: 0,
    flatten: 0,
    generateHeaders: 0,
    generateRows: 0,
    processLevel: 0,
    aggregate: 0,
    aggregateValues: 0,
    generateTotalsRow: 0,
    sortRows: 0,
    sortRowsRecursive: 0,
    findColumnIndex: 0,
    calculateGroupValue: 0,
    filterData: 0
  };

  /* window.lookupTable = {};

  window.buildLookupTable = (data, config) => {
      let lt = window.lookupTable = {};
      let raw = window.rawData;
      raw.forEach(d => {
          for( let i=0; i<config.rows.length; i++) {
              const rowName = config.rows[i].field;
              lt[rowName] = {};
          }
      });
      // parse rows
      for( let i=0; i<config.rows.length; i++) {
          const rowName = config.rows[i].field;
          lt[rowName] = {};
          
      }
  } */

  class PivotProcessor {
    constructor(data, config) {
      window.functionCallCounter.constructor++;
      this.rawData = data || [];
      window.rawData = this.rawData;
      this.config = config || {
        rows: [],
        columns: [],
        values: []
      };
      window.config = this.config;
      this.rowFields = config.rows.map(r => r.field);
      this.columnFields = config.columns.map(c => c.field);
      this.valueFields = config.values;
    }
    getFieldDisplayName(fieldConfig) {
      return fieldConfig.label || fieldConfig.field;
    }
    getValueHeader(valueField) {
      const displayName = this.getFieldDisplayName(valueField);
      return valueField.label ? displayName : `${displayName} (${valueField.aggregation})`;
    }
    process(sortConfig = null) {
      window.functionCallCounter.process++;
      // Generate pivot data structure
      const result = this.generatePivotStructure(this.config);
      console.log('Generated pivot structure:', {
        headerCount: result.headers.length,
        rowCount: result.rows.length,
        hasTotals: !!result.totals
      });

      // Apply sorting if needed
      if (sortConfig && sortConfig.column) {
        result.rows = this.sortRows(result.rows, sortConfig);
      }
      return result;
    }
    generatePivotStructure(config) {
      window.functionCallCounter.generatePivotStructure++;
      console.log('Generating pivot structure with config:', config);
      const {
        rows,
        columns,
        values
      } = config;

      // Generate hierarchical row structure
      const rowHierarchy = this.generateRowHierarchy(rows);
      console.log('Generated row hierarchy:', rowHierarchy);

      // Generate unique column combinations excluding row fields
      let colValues = columns.length ? [...new Set(this.rawData.map(d => columns.map(c => d[c.field]).join('|')))] : [];

      // Sort column values based on column field sorting configuration
      if (columns.length) {
        colValues = this.sortColumnValues(colValues, columns);
      }
      console.log('Generated column values:', colValues);
      const headers = this.generateHeaders(colValues, columns, values);
      const tableRows = this.generateRows(rowHierarchy, colValues, rows, columns, values);

      // Add totals
      const totalsRow = this.generateTotalsRow(this.flattenRows(tableRows), values, columns);
      const result = {
        headers,
        rows: tableRows,
        totals: totalsRow
      };
      console.log('Final pivot structure:', {
        headerCount: headers.length,
        rowCount: tableRows.length,
        hasTotals: !!totalsRow
      });
      return result;
    }
    sortColumnValues(colValues, columns) {
      window.functionCallCounter.sortColumnValues++;
      // Split each column value into its parts
      const valueParts = colValues.map(cv => ({
        original: cv,
        parts: cv.split('|')
      }));

      // Group values by their parent paths
      const groupByParent = (values, level) => {
        window.functionCallCounter.groupByParent++;
        if (level === 0) return {
          '': values
        };
        const groups = {};
        values.forEach(value => {
          const parentPath = value.parts.slice(0, level).join('|');
          if (!groups[parentPath]) groups[parentPath] = [];
          groups[parentPath].push(value);
        });
        return groups;
      };

      // Sort a group of values at a specific level
      const sortGroup = (values, level) => {
        window.functionCallCounter.sortGroup++;
        const column = columns[level];
        const {
          sortBy,
          sortOrder
        } = column;
        values.sort((a, b) => {
          let valueA = a.parts[level];
          let valueB = b.parts[level];
          if (sortBy === 'label') {
            // For label sorting, compare the values directly
            const comparison = String(valueA).localeCompare(String(valueB));
            return sortOrder === 'asc' ? comparison : -comparison;
          } else {
            // For value-based sorting, we need to aggregate the values
            // First try to find by simple format (field_aggregation)
            let valueField = this.config.values.find(v => {
              const simpleId = `${v.field}_${v.aggregation.toLowerCase()}`;
              return simpleId === sortBy;
            });

            // If not found, try with full ID format
            if (!valueField) {
              valueField = this.config.values.find(v => v.id === sortBy);
            }
            if (valueField) {
              // Filter records for each column value
              const recordsA = this.filterData(this.rawData, a.parts.slice(0, level + 1).reduce((acc, val, idx) => {
                acc[columns[idx].field] = val;
                return acc;
              }, {}));
              const recordsB = this.filterData(this.rawData, b.parts.slice(0, level + 1).reduce((acc, val, idx) => {
                acc[columns[idx].field] = val;
                return acc;
              }, {}));

              // Calculate aggregated values
              valueA = this.aggregateValues(recordsA, valueField.field, valueField.aggregation);
              valueB = this.aggregateValues(recordsB, valueField.field, valueField.aggregation);
            }

            // Compare the values
            const comparison = valueA - valueB;
            return sortOrder === 'asc' ? comparison : -comparison;
          }
        });
        return values;
      };

      // Sort recursively by each column level
      const sortByLevel = (values, level) => {
        window.functionCallCounter.sortByLevel++;
        if (level >= columns.length) return values;

        // Group values by their parent paths
        const groups = groupByParent(values, level);

        // Sort each group independently
        Object.values(groups).forEach(group => {
          sortGroup(group, level);
        });

        // Flatten the groups back into a single array while maintaining the sorted order
        const sortedValues = Object.values(groups).flat();

        // Continue sorting the next level
        return sortByLevel(sortedValues, level + 1);
      };

      // Start sorting from the first level
      const sortedValues = sortByLevel(valueParts, 0);

      // Return the sorted original values
      return sortedValues.map(vp => vp.original);
    }
    calculateAverage(rows, columnIndex) {
      window.functionCallCounter.calculateAverage++;
      let sum = 0;
      let count = 0;
      const processRow = row => {
        window.functionCallCounter.processRow++;
        if (row.cells[columnIndex]?.value != null) {
          sum += row.cells[columnIndex].value;
          count++;
        }
        if (row.children) {
          row.children.forEach(processRow);
        }
      };
      rows.forEach(processRow);
      return count > 0 ? sum / count : 0;
    }
    generateRowHierarchy(rowFields) {
      window.functionCallCounter.generateRowHierarchy++;
      if (!rowFields.length) return [];

      // Pre-calculate sort field if sorting by value
      const sortValueFields = new Map();
      rowFields.forEach(field => {
        if (field.sortBy !== 'label') {
          // First try to find by simple format (field_aggregation)
          let valueField = this.config.values.find(v => {
            const simpleId = `${v.field}_${v.aggregation.toLowerCase()}`;
            return simpleId === field.sortBy;
          });

          // If not found, try with full ID format
          if (!valueField) {
            valueField = this.config.values.find(v => v.id === field.sortBy);
          }
          if (valueField) {
            sortValueFields.set(field.field, valueField);
          }
        }
      });

      // Create initial hierarchy with pre-sorted arrays at each level
      const hierarchyArrays = new Map();

      // First pass: collect unique values and records for each level
      this.rawData.forEach(record => {
        let path = '';
        rowFields.forEach((field, depth) => {
          const value = record[field.field];
          const currentPath = path ? `${path}|${value}` : value;
          if (!hierarchyArrays.has(currentPath)) {
            hierarchyArrays.set(currentPath, {
              id: currentPath,
              // Use the path as a unique ID
              value,
              field: field.field,
              depth,
              children: new Set(),
              records: [],
              parentPath: path
            });
          }
          hierarchyArrays.get(currentPath).records.push(record);
          path = currentPath;
        });
      });

      // Second pass: build parent-child relationships and sort
      const rootNodes = [];
      const processedPaths = new Set();

      // Helper function to sort nodes
      const sortNodes = (nodes, field) => {
        window.functionCallCounter.sortNodes++;
        const {
          sortBy,
          sortOrder
        } = field;
        const valueField = sortValueFields.get(field.field);
        return nodes.sort((a, b) => {
          let valueA, valueB;
          if (sortBy === 'label') {
            valueA = a.value;
            valueB = b.value;
          } else if (valueField) {
            // Use pre-calculated aggregations
            valueA = this.aggregateValues(a.records, valueField.field, valueField.aggregation);
            valueB = this.aggregateValues(b.records, valueField.field, valueField.aggregation);
          } else {
            valueA = a.value;
            valueB = b.value;
          }

          // Handle null/undefined
          if (valueA == null && valueB == null) return 0;
          if (valueA == null) return sortOrder === 'asc' ? 1 : -1;
          if (valueB == null) return sortOrder === 'asc' ? -1 : 1;

          // Compare values
          const comparison = typeof valueA === 'number' && typeof valueB === 'number' ? valueA - valueB : String(valueA).localeCompare(String(valueB));
          return sortOrder === 'asc' ? comparison : -comparison;
        });
      };

      // Process each level
      rowFields.forEach((field, depth) => {
        const currentLevelNodes = [];

        // Get all nodes at this depth
        hierarchyArrays.forEach((node, path) => {
          if (node.depth === depth && !processedPaths.has(path)) {
            processedPaths.add(path);

            // Find and link children
            hierarchyArrays.forEach(childNode => {
              if (childNode.parentPath === path) {
                node.children.add(childNode);
              }
            });
            if (depth === 0) {
              rootNodes.push(node);
            }
            currentLevelNodes.push(node);
          }
        });

        // Sort nodes at this level
        sortNodes(currentLevelNodes, field);
      });

      // Convert Sets to Arrays for children
      const finalizeNode = node => {
        window.functionCallCounter.finalizeNode++;
        node.children = sortNodes(Array.from(node.children), rowFields[node.depth + 1] || rowFields[node.depth]);
        node.children.forEach(finalizeNode);
        return node;
      };
      return sortNodes(rootNodes, rowFields[0]).map(finalizeNode);
    }
    mapToArray(map, parentPath = [], parent = null) {
      window.functionCallCounter.mapToArray++;
      return Array.from(map.values()).map(node => {
        const row = {
          id: [...parentPath, node.value].join('|'),
          value: node.value,
          field: node.field,
          depth: node.depth,
          parent,
          records: node.records
        };
        row.children = this.mapToArray(node.children, [...parentPath, node.value], row);
        return row;
      });
    }
    flattenRows(rows) {
      window.functionCallCounter.flattenRows++;
      const flattened = [];
      const flatten = row => {
        window.functionCallCounter.flatten++;
        flattened.push(row);
        if (row.children) {
          row.children.forEach(flatten);
        }
      };
      rows.forEach(flatten);
      return flattened;
    }
    generateHeaders(colValues, colFields, valueFields) {
      window.functionCallCounter.generateHeaders++;
      if (!colValues.length) {
        // If no column fields, just show value fields
        return [{
          rows: valueFields.map(vf => ({
            id: vf.id || this.generateValueFieldId(vf),
            label: this.getValueHeader(vf),
            colspan: 1
          }))
        }];
      }

      // Create header rows for each level
      const headerRows = [];

      // Process column fields
      for (let level = 0; level < colFields.length; level++) {
        const headers = new Map();
        colValues.forEach(cv => {
          const parts = cv.split('|');
          const value = parts[level];
          const parentKey = parts.slice(0, level).join('|');
          const fullKey = parts.slice(0, level + 1).join('|');
          if (!headers.has(fullKey)) {
            // Count how many leaf nodes (value fields) are under this header
            const colspan = colValues.filter(v => v.startsWith(fullKey + '|') || v === fullKey).length * valueFields.length; // Multiply by number of value fields

            headers.set(fullKey, {
              id: fullKey,
              label: value,
              colspan,
              parentKey: level > 0 ? parentKey : null,
              field: colFields[level].field
            });
          }
        });
        headerRows.push(Array.from(headers.values()));
      }

      // Add value fields as the deepest level
      const leafHeaders = [];
      colValues.forEach(cv => {
        valueFields.forEach(vf => {
          const valueFieldId = vf.id || this.generateValueFieldId(vf);
          leafHeaders.push({
            id: `${cv}|${valueFieldId}`,
            label: this.getValueHeader(vf),
            colspan: 1,
            parentKey: cv,
            field: vf.field
          });
        });
      });
      headerRows.push(leafHeaders);
      return headerRows;
    }

    // Add new method to generate consistent value field IDs
    generateValueFieldId(valueField) {
      const {
        field,
        aggregation,
        label
      } = valueField;
      const baseId = `${field}_${aggregation.toLowerCase()}`;
      return label ? `${baseId}_${label.replace(/\s+/g, '_')}` : baseId;
    }
    generateRows(rowHierarchy, colValues, rowFields, colFields, valueFields) {
      window.functionCallCounter.generateRows++;
      // Pre-calculate column criteria maps for faster lookup
      const colCriteriaMaps = colValues.map(cv => {
        const parts = cv.split('|');
        return parts.reduce((acc, val, idx) => {
          acc[colFields[idx].field] = val;
          return acc;
        }, {});
      });
      const processLevel = (node, parent = null) => {
        window.functionCallCounter.processLevel++;
        // Pre-filter records by column criteria once per row
        const columnFilteredData = new Map();
        if (colValues.length) {
          colCriteriaMaps.forEach((colCriteria, idx) => {
            // Use node.records which are already filtered for this hierarchy level
            const filtered = node.records.filter(record => Object.entries(colCriteria).every(([field, value]) => record[field] === value));
            columnFilteredData.set(colValues[idx], filtered);
          });
        }

        // Generate cells using pre-filtered data
        let cells;
        if (colValues.length) {
          cells = colValues.flatMap(cv => {
            const filteredRecords = columnFilteredData.get(cv);
            return valueFields.map(vf => {
              const valueFieldId = vf.id || this.generateValueFieldId(vf);
              return {
                id: `${node.id}|${cv}|${valueFieldId}`,
                value: this.aggregate(filteredRecords, vf)
              };
            });
          });
        } else {
          // No column values - use node.records directly
          cells = valueFields.map(vf => {
            const valueFieldId = vf.id || this.generateValueFieldId(vf);
            return {
              id: `${node.id}|${valueFieldId}`,
              value: this.aggregate(node.records, vf)
            };
          });
        }

        // Create row object
        const row = {
          id: node.id,
          label: node.value,
          depth: node.depth,
          hasChildren: node.children && node.children.length > 0,
          parent,
          records: node.records,
          cells
        };

        // Process children
        if (node.children && node.children.length) {
          row.children = node.children.map(child => processLevel(child, row));
        } else {
          row.children = [];
        }
        return row;
      };
      return rowHierarchy.map(node => processLevel(node));
    }
    aggregate(rows, valueField) {
      window.functionCallCounter.aggregate++;
      return this.aggregateValues(rows, valueField.field, valueField.aggregation);
    }
    generateTotalsRow(rows, valueFields, columnFields) {
      window.functionCallCounter.generateTotalsRow++;
      if (!rows.length) return null;
      console.log('\nGenerating totals row');
      console.log('Number of rows:', rows.length);
      console.log('Value fields:', valueFields);
      console.log('Column fields:', columnFields);
      return {
        id: 'total',
        label: 'Total',
        cells: rows[0].cells.map(cell => {
          // Get column criteria from cell ID
          const cellParts = cell.id.split('|');

          // The last part is now the full valueFieldId
          const valueFieldId = cellParts[cellParts.length - 1];

          // Find the matching value field
          const valueField = valueFields.find(vf => {
            const vfId = vf.id || this.generateValueFieldId(vf);
            return vfId === valueFieldId;
          });
          if (!valueField) {
            console.log('No value field found, returning 0');
            return {
              id: `total|${cellParts.slice(1).join('|')}`,
              value: 0
            };
          }

          // Extract column values from cell ID (everything between first and last parts)
          const colValues = cellParts.slice(1, -1);

          // Create column criteria object
          const colCriteria = {};
          colValues.forEach((value, index) => {
            colCriteria[columnFields[index].field] = value;
          });

          // Filter raw data based on column criteria
          const filteredRecords = this.filterData(this.rawData, colCriteria);

          // Calculate aggregation using the same method as for regular cells
          const value = this.aggregateValues(filteredRecords, valueField.field, valueField.aggregation);

          // Generate a unique ID that includes both column path and value field ID
          const vfId = valueField.id || this.generateValueFieldId(valueField);
          const uniqueId = `total|${colValues.join('|')}|${vfId}`;
          return {
            id: uniqueId,
            value
          };
        })
      };
    }
    sortRows(rows, sortConfig) {
      window.functionCallCounter.sortRows++;
      if (!sortConfig.column) return rows;
      const colIndex = this.findColumnIndex(rows[0]?.cells || [], sortConfig.column);
      if (colIndex === -1) return rows;
      const sortRowsRecursive = rows => {
        window.functionCallCounter.sortRowsRecursive++;
        rows.sort((a, b) => {
          const aVal = a.cells[colIndex]?.value || 0;
          const bVal = b.cells[colIndex]?.value || 0;
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        });

        // Sort children recursively
        rows.forEach(row => {
          if (row.children && row.children.length) {
            sortRowsRecursive(row.children);
          }
        });
        return rows;
      };
      return sortRowsRecursive([...rows]);
    }
    findColumnIndex(cells, columnId) {
      window.functionCallCounter.findColumnIndex++;
      return cells.findIndex(cell => {
        const cellIdParts = cell.id.split('|').slice(1);
        return cellIdParts.join('|') === columnId;
      });
    }
    aggregateValues(records, field, aggregation) {
      window.functionCallCounter.aggregateValues++;
      if (!records || !records.length) return 0;

      // Handle custom formula
      if (aggregation.toLowerCase() === 'custom') {
        // Get the formula from the value field configuration
        const valueField = this.config.values.find(v => v.field === field && v.aggregation.toLowerCase() === 'custom' && v.formula);
        if (!valueField || !valueField.formula) {
          return 0;
        }
        try {
          // Create a context with aggregation functions and field values
          const context = {
            SUM: fieldName => {
              const result = this.aggregateValues(this.rawData, fieldName, 'sum');
              return result;
            },
            COUNT: fieldName => {
              const result = this.aggregateValues(this.rawData, fieldName, 'count');
              return result;
            },
            COUNTA: fieldName => this.aggregateValues(this.rawData, fieldName, 'counta'),
            COUNTUNIQUE: fieldName => this.aggregateValues(this.rawData, fieldName, 'countunique'),
            AVERAGE: fieldName => this.aggregateValues(this.rawData, fieldName, 'average'),
            MAX: fieldName => this.aggregateValues(this.rawData, fieldName, 'max'),
            MIN: fieldName => this.aggregateValues(this.rawData, fieldName, 'min'),
            MEDIAN: fieldName => this.aggregateValues(this.rawData, fieldName, 'median'),
            STDEV: fieldName => this.aggregateValues(this.rawData, fieldName, 'stdev'),
            STDEVP: fieldName => this.aggregateValues(this.rawData, fieldName, 'stdevp'),
            VAR: fieldName => this.aggregateValues(this.rawData, fieldName, 'var'),
            VARP: fieldName => this.aggregateValues(this.rawData, fieldName, 'varp')
          };

          // Replace field references with actual values
          let formula = valueField.formula;

          // First, replace function calls
          Object.keys(context).forEach(func => {
            const regex = new RegExp(`${func}\\{([^}]+)\\}`, 'g');
            formula = formula.replace(regex, (_, field) => `${func}('${field}')`);
          });

          // Then replace remaining field references with aggregated sums
          formula = formula.replace(/\{([^}]+)\}/g, (_, fieldName) => {
            let value;
            if (records.length === 1) {
              // For single record, use its value directly
              value = records[0][fieldName];
              // Convert to number and handle null/undefined
              value = typeof value === 'number' ? value : parseFloat(value) || 0;
            } else {
              // For multiple records, sum the values
              value = records.reduce((sum, record) => {
                const recordValue = record[fieldName];
                // Convert to number and handle null/undefined
                const numValue = typeof recordValue === 'number' ? recordValue : parseFloat(recordValue) || 0;
                return sum + numValue;
              }, 0);
            }

            // Return the value as a number literal
            return value.toString();
          });

          // Create a safe evaluation function
          const evalFunction = new Function(...Object.keys(context), `return ${formula}`);

          // Execute the formula with the context
          const result = evalFunction(...Object.values(context));
          return result;
        } catch (error) {
          console.error('FORMULA_DEBUG: Error evaluating formula:', error);
          return 0;
        }
      }
      const values = records.map(r => r[field]).filter(v => v != null);
      if (!values.length) return 0;

      // For non-hierarchical aggregations, use all records
      switch (aggregation.toLowerCase()) {
        case 'sum':
        case 'count':
        case 'counta':
        case 'countunique':
        case 'avg':
        case 'average':
          break;
        // These can use all records directly
        default:
          {
            // For other aggregations, we need to first aggregate by the lowest level groups
            const groups = new Map();

            // Get the lowest level field from row configuration
            const rowFields = this.config.rows;
            if (!rowFields || !rowFields.length) {
              // If no row fields defined, treat all records as one group
              groups.set('all', values);
            } else {
              // Group by the lowest level in the hierarchy (last row field)
              const lowestLevelField = rowFields[rowFields.length - 1].field;
              records.forEach(record => {
                const groupKey = record[lowestLevelField];
                if (!groups.has(groupKey)) {
                  groups.set(groupKey, []);
                }
                groups.get(groupKey).push(record[field]);
              });
            }

            // Get one value per group using the specified aggregation
            values.length = 0; // Clear the array
            for (const groupValues of groups.values()) {
              const groupValue = this.calculateGroupValue(groupValues, aggregation);
              if (groupValue != null) {
                values.push(groupValue);
              }
            }
            break;
          }
      }

      // Now apply the final aggregation
      switch (aggregation.toLowerCase()) {
        case 'sum':
          return values.reduce((a, b) => a + b, 0);
        case 'count':
          return records.length;
        case 'counta':
          return values.length;
        case 'countunique':
          return new Set(values).size;
        case 'avg':
        case 'average':
          {
            const sum = values.reduce((a, b) => a + b, 0);
            return values.length > 0 ? sum / values.length : 0;
          }
        case 'max':
          return Math.max(...values);
        case 'min':
          return Math.min(...values);
        case 'median':
          {
            const sorted = [...values].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
          }
        case 'stdev':
          {
            if (values.length < 2) return 0;
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (values.length - 1);
            return Math.sqrt(variance);
          }
        case 'stdevp':
          {
            if (values.length < 1) return 0;
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
            return Math.sqrt(variance);
          }
        case 'var':
          {
            if (values.length < 2) return 0;
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            return values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (values.length - 1);
          }
        case 'varp':
          {
            if (values.length < 1) return 0;
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            return values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
          }
        default:
          return 0;
      }
    }
    calculateGroupValue(values, aggregation) {
      window.functionCallCounter.calculateGroupValue++;
      if (!values || !values.length) return null;
      switch (aggregation.toLowerCase()) {
        case 'sum':
          return values.reduce((a, b) => a + b, 0);
        case 'avg':
        case 'average':
          return values.reduce((a, b) => a + b, 0) / values.length;
        case 'max':
          return Math.max(...values);
        case 'min':
          return Math.min(...values);
        case 'median':
          {
            const sorted = [...values].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
          }
        default:
          return values[0];
        // For other aggregations, just take the first value
      }
    }
    filterData(records, colCriteria) {
      window.functionCallCounter.filterData++;
      return records.filter(d => Object.entries(colCriteria).every(([k, v]) => d[k] === v));
    }
  }

  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //

  var script$3 = {
      name: 'DrillThroughModal',
      directives: {
          'click-outside': {
              bind(el, binding) {
                  el.clickOutsideEvent = function(event) {
                      if (!(el === event.target || el.contains(event.target))) {
                          binding.value(event);
                      }
                  };
                  document.addEventListener('click', el.clickOutsideEvent);
              },
              unbind(el) {
                  document.removeEventListener('click', el.clickOutsideEvent);
              }
          }
      },
      props: {
          data: {
              type: Array,
              required: true
          },
          columns: {
              type: Array,
              required: true
          },
          title: {
              type: String,
              required: true
          }
      },

      data() {
          return {
              showExportMenu: false
          };
      },

      mounted() {
          // Add event listener for Escape key
          document.addEventListener('keydown', this.handleKeyDown);
      },

      beforeDestroy() {
          // Clean up event listener
          document.removeEventListener('keydown', this.handleKeyDown);
      },

      methods: {
          handleKeyDown(event) {
              if (event.key === 'Escape') {
                  this.showExportMenu = false;
                  this.$emit('close');
              }
          },

          toggleExportMenu() {
              this.showExportMenu = !this.showExportMenu;
          },

          closeExportMenu() {
              this.showExportMenu = false;
          },

          downloadData(format) {
              let content;
              let mimeType;
              let extension;

              switch (format) {
                  case 'csv':
                      content = this.convertToCSV(',');
                      mimeType = 'text/csv';
                      extension = 'csv';
                      break;
                  case 'tsv':
                      content = this.convertToCSV('\t');
                      mimeType = 'text/tab-separated-values';
                      extension = 'tsv';
                      break;
                  case 'json':
                      content = this.convertToJSON();
                      mimeType = 'application/json';
                      extension = 'json';
                      break;
                  default:
                      return;
              }

              // Create and trigger download
              const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
              const link = document.createElement('a');
              const url = URL.createObjectURL(blob);
              
              link.setAttribute('href', url);
              link.setAttribute('download', this.getFileName(extension));
              link.style.visibility = 'hidden';
              
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);

              // Close the export menu
              this.showExportMenu = false;
          },

          convertToCSV(delimiter) {
              // Add BOM for Excel UTF-8 compatibility
              let csv = '\ufeff';
              
              // Add headers
              csv += this.columns.map(this.escapeField).join(delimiter) + '\n';
              
              // Add data rows
              csv += this.data.map(row => {
                  return this.columns.map(col => this.escapeField(row[col], delimiter)).join(delimiter);
              }).join('\n');
              
              return csv;
          },

          convertToJSON() {
              // Convert data to array of objects with only the selected columns
              const jsonData = this.data.map(row => {
                  const newRow = {};
                  this.columns.forEach(col => {
                      newRow[col] = row[col];
                  });
                  return newRow;
              });
              
              return JSON.stringify(jsonData, null, 2);
          },

          escapeField(field, delimiter = ',') {
              if (field === null || field === undefined) {
                  return '';
              }
              
              const stringField = String(field);
              
              // If the field contains quotes, delimiters, or newlines, wrap it in quotes and escape existing quotes
              if (stringField.includes('"') || stringField.includes(delimiter) || stringField.includes('\n')) {
                  return `"${stringField.replace(/"/g, '""')}"`;
              }
              
              return stringField;
          },

          getFileName(extension) {
              const date = new Date().toISOString().split('T')[0];
              const sanitizedTitle = this.title
                  .replace('Drill Through - ', '')
                  .replace(/[^a-z0-9]/gi, '_')
                  .replace(/_+/g, '_')
                  .toLowerCase();
              return `${sanitizedTitle}_${date}.${extension}`;
          }
      }
  };

  function normalizeComponent(template, style, script, scopeId, isFunctionalTemplate, moduleIdentifier /* server only */, shadowMode, createInjector, createInjectorSSR, createInjectorShadow) {
      if (typeof shadowMode !== 'boolean') {
          createInjectorSSR = createInjector;
          createInjector = shadowMode;
          shadowMode = false;
      }
      // Vue.extend constructor export interop.
      const options = typeof script === 'function' ? script.options : script;
      // render functions
      if (template && template.render) {
          options.render = template.render;
          options.staticRenderFns = template.staticRenderFns;
          options._compiled = true;
          // functional template
          if (isFunctionalTemplate) {
              options.functional = true;
          }
      }
      // scopedId
      if (scopeId) {
          options._scopeId = scopeId;
      }
      let hook;
      if (moduleIdentifier) {
          // server build
          hook = function (context) {
              // 2.3 injection
              context =
                  context || // cached call
                      (this.$vnode && this.$vnode.ssrContext) || // stateful
                      (this.parent && this.parent.$vnode && this.parent.$vnode.ssrContext); // functional
              // 2.2 with runInNewContext: true
              if (!context && typeof __VUE_SSR_CONTEXT__ !== 'undefined') {
                  context = __VUE_SSR_CONTEXT__;
              }
              // inject component styles
              if (style) {
                  style.call(this, createInjectorSSR(context));
              }
              // register component module identifier for async chunk inference
              if (context && context._registeredComponents) {
                  context._registeredComponents.add(moduleIdentifier);
              }
          };
          // used by ssr in case component is cached and beforeCreate
          // never gets called
          options._ssrRegister = hook;
      }
      else if (style) {
          hook = shadowMode
              ? function (context) {
                  style.call(this, createInjectorShadow(context, this.$root.$options.shadowRoot));
              }
              : function (context) {
                  style.call(this, createInjector(context));
              };
      }
      if (hook) {
          if (options.functional) {
              // register for functional component in vue file
              const originalRender = options.render;
              options.render = function renderWithStyleInjection(h, context) {
                  hook.call(context);
                  return originalRender(h, context);
              };
          }
          else {
              // inject component registration as beforeCreate hook
              const existing = options.beforeCreate;
              options.beforeCreate = existing ? [].concat(existing, hook) : [hook];
          }
      }
      return script;
  }

  const isOldIE = typeof navigator !== 'undefined' &&
      /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());
  function createInjector(context) {
      return (id, style) => addStyle(id, style);
  }
  let HEAD;
  const styles = {};
  function addStyle(id, css) {
      const group = isOldIE ? css.media || 'default' : id;
      const style = styles[group] || (styles[group] = { ids: new Set(), styles: [] });
      if (!style.ids.has(id)) {
          style.ids.add(id);
          let code = css.source;
          if (css.map) {
              // https://developer.chrome.com/devtools/docs/javascript-debugging
              // this makes source maps inside style tags work properly in Chrome
              code += '\n/*# sourceURL=' + css.map.sources[0] + ' */';
              // http://stackoverflow.com/a/26603875
              code +=
                  '\n/*# sourceMappingURL=data:application/json;base64,' +
                      btoa(unescape(encodeURIComponent(JSON.stringify(css.map)))) +
                      ' */';
          }
          if (!style.element) {
              style.element = document.createElement('style');
              style.element.type = 'text/css';
              if (css.media)
                  style.element.setAttribute('media', css.media);
              if (HEAD === undefined) {
                  HEAD = document.head || document.getElementsByTagName('head')[0];
              }
              HEAD.appendChild(style.element);
          }
          if ('styleSheet' in style.element) {
              style.styles.push(code);
              style.element.styleSheet.cssText = style.styles
                  .filter(Boolean)
                  .join('\n');
          }
          else {
              const index = style.ids.size - 1;
              const textNode = document.createTextNode(code);
              const nodes = style.element.childNodes;
              if (nodes[index])
                  style.element.removeChild(nodes[index]);
              if (nodes.length)
                  style.element.insertBefore(textNode, nodes[index]);
              else
                  style.element.appendChild(textNode);
          }
      }
  }

  /* script */
  const __vue_script__$3 = script$3;

  /* template */
  var __vue_render__$3 = function () {
    var _vm = this;
    var _h = _vm.$createElement;
    var _c = _vm._self._c || _h;
    return _c(
      "div",
      {
        staticClass: "drill-modal-backdrop",
        on: {
          click: function ($event) {
            if ($event.target !== $event.currentTarget) {
              return null
            }
            return _vm.$emit("close")
          },
        },
      },
      [
        _c("div", { staticClass: "drill-modal" }, [
          _c("div", { staticClass: "drill-modal-header" }, [
            _c("div", { staticClass: "header-content" }, [
              _c("h3", [_vm._v(_vm._s(_vm.title))]),
              _vm._v(" "),
              _c("span", { staticClass: "record-count" }, [
                _vm._v("(" + _vm._s(_vm.data.length) + " records)"),
              ]),
            ]),
            _vm._v(" "),
            _c("div", { staticClass: "header-actions" }, [
              _c(
                "div",
                {
                  directives: [
                    {
                      name: "click-outside",
                      rawName: "v-click-outside",
                      value: _vm.closeExportMenu,
                      expression: "closeExportMenu",
                    },
                  ],
                  staticClass: "export-dropdown",
                },
                [
                  _c(
                    "button",
                    {
                      staticClass: "export-btn",
                      attrs: { title: "Export data" },
                      on: { click: _vm.toggleExportMenu },
                    },
                    [
                      _c("span", { staticClass: "download-icon" }, [_vm._v("⬇")]),
                      _vm._v(" Export\n                        "),
                      _c(
                        "span",
                        {
                          staticClass: "dropdown-arrow",
                          class: { open: _vm.showExportMenu },
                        },
                        [_vm._v("▾")]
                      ),
                    ]
                  ),
                  _vm._v(" "),
                  _vm.showExportMenu
                    ? _c("div", { staticClass: "export-menu" }, [
                        _c(
                          "button",
                          {
                            staticClass: "menu-item",
                            on: {
                              click: function ($event) {
                                return _vm.downloadData("csv")
                              },
                            },
                          },
                          [
                            _c("span", { staticClass: "format" }, [
                              _vm._v("CSV"),
                            ]),
                            _vm._v(" "),
                            _c("span", { staticClass: "description" }, [
                              _vm._v("Comma-separated values"),
                            ]),
                          ]
                        ),
                        _vm._v(" "),
                        _c(
                          "button",
                          {
                            staticClass: "menu-item",
                            on: {
                              click: function ($event) {
                                return _vm.downloadData("tsv")
                              },
                            },
                          },
                          [
                            _c("span", { staticClass: "format" }, [
                              _vm._v("TSV"),
                            ]),
                            _vm._v(" "),
                            _c("span", { staticClass: "description" }, [
                              _vm._v("Tab-separated values"),
                            ]),
                          ]
                        ),
                        _vm._v(" "),
                        _c(
                          "button",
                          {
                            staticClass: "menu-item",
                            on: {
                              click: function ($event) {
                                return _vm.downloadData("json")
                              },
                            },
                          },
                          [
                            _c("span", { staticClass: "format" }, [
                              _vm._v("JSON"),
                            ]),
                            _vm._v(" "),
                            _c("span", { staticClass: "description" }, [
                              _vm._v("JavaScript Object Notation"),
                            ]),
                          ]
                        ),
                      ])
                    : _vm._e(),
                ]
              ),
              _vm._v(" "),
              _c(
                "button",
                {
                  staticClass: "close-btn",
                  on: {
                    click: function ($event) {
                      return _vm.$emit("close")
                    },
                  },
                },
                [_vm._v("×")]
              ),
            ]),
          ]),
          _vm._v(" "),
          _c("div", { staticClass: "drill-modal-body" }, [
            _c("table", [
              _c("thead", [
                _c(
                  "tr",
                  _vm._l(_vm.columns, function (col) {
                    return _c("th", { key: col }, [_vm._v(_vm._s(col))])
                  }),
                  0
                ),
              ]),
              _vm._v(" "),
              _c(
                "tbody",
                _vm._l(_vm.data, function (row, idx) {
                  return _c(
                    "tr",
                    { key: idx },
                    _vm._l(_vm.columns, function (col) {
                      return _c("td", { key: col }, [_vm._v(_vm._s(row[col]))])
                    }),
                    0
                  )
                }),
                0
              ),
            ]),
          ]),
        ]),
      ]
    )
  };
  var __vue_staticRenderFns__$3 = [];
  __vue_render__$3._withStripped = true;

    /* style */
    const __vue_inject_styles__$3 = function (inject) {
      if (!inject) return
      inject("data-v-9d4f8f22_0", { source: ".drill-modal-backdrop[data-v-9d4f8f22] {\n  position: fixed;\n  top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  background: rgba(0, 0, 0, 0.5);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n.drill-modal[data-v-9d4f8f22] {\n  background: var(--st-dashboard-bg-1);\n  color: var(--st-text-1);\n  border-radius: 8px;\n  width: 90%;\n  max-width: 1200px;\n  max-height: 90vh;\n  display: flex;\n  flex-direction: column;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);\n}\n.drill-modal .drill-modal-header[data-v-9d4f8f22] {\n  padding: 16px;\n  border-bottom: 1px solid var(--st-color-neutral);\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}\n.drill-modal .drill-modal-header .header-content[data-v-9d4f8f22] {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n}\n.drill-modal .drill-modal-header .header-content h3[data-v-9d4f8f22] {\n  margin: 0;\n  font-size: 18px;\n  color: var(--st-text-1);\n}\n.drill-modal .drill-modal-header .header-content .record-count[data-v-9d4f8f22] {\n  color: var(--st-text-2);\n  font-size: 14px;\n}\n.drill-modal .drill-modal-header .header-actions[data-v-9d4f8f22] {\n  display: flex;\n  align-items: center;\n  gap: 30px;\n}\n.drill-modal .drill-modal-header .close-btn[data-v-9d4f8f22] {\n  background: none;\n  border: none;\n  font-size: 24px;\n  cursor: pointer;\n  color: var(--st-text-2);\n}\n.drill-modal .drill-modal-header .close-btn[data-v-9d4f8f22]:hover {\n  color: var(--st-text-1);\n}\n.drill-modal .drill-modal-header .export-dropdown[data-v-9d4f8f22] {\n  position: relative;\n}\n.drill-modal .drill-modal-header .export-btn[data-v-9d4f8f22] {\n  display: flex;\n  align-items: center;\n  gap: 4px;\n  padding: 1px 6px;\n  border: 1px solid var(--st-color-neutral);\n  border-radius: 4px;\n  background: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n  color: var(--st-text-2);\n  font-size: 14px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.drill-modal .drill-modal-header .export-btn .download-icon[data-v-9d4f8f22] {\n  font-size: 16px;\n}\n.drill-modal .drill-modal-header .export-btn .dropdown-arrow[data-v-9d4f8f22] {\n  margin-left: 4px;\n  transition: transform 0.2s;\n}\n.drill-modal .drill-modal-header .export-btn .dropdown-arrow.open[data-v-9d4f8f22] {\n  transform: rotate(180deg);\n}\n.drill-modal .drill-modal-header .export-btn[data-v-9d4f8f22]:hover {\n  background: color-mix(in srgb, var(--st-text-1) 15%, transparent);\n}\n.drill-modal .drill-modal-header .export-menu[data-v-9d4f8f22] {\n  position: absolute;\n  top: 100%;\n  right: 0;\n  margin-top: 4px;\n  background: white;\n  border: 1px solid #ddd;\n  border-radius: 4px;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);\n  z-index: 1000;\n  min-width: 200px;\n}\n.drill-modal .drill-modal-header .export-menu .menu-item[data-v-9d4f8f22] {\n  display: flex;\n  flex-direction: column;\n  width: 100%;\n  padding: 8px 12px;\n  border: none;\n  background: none;\n  text-align: left;\n  cursor: pointer;\n  transition: background 0.2s;\n}\n.drill-modal .drill-modal-header .export-menu .menu-item .format[data-v-9d4f8f22] {\n  font-weight: 500;\n  color: #333;\n}\n.drill-modal .drill-modal-header .export-menu .menu-item .description[data-v-9d4f8f22] {\n  font-size: 12px;\n  color: #666;\n}\n.drill-modal .drill-modal-header .export-menu .menu-item[data-v-9d4f8f22]:hover {\n  background: #f5f5f5;\n}\n.drill-modal .drill-modal-header .export-menu .menu-item[data-v-9d4f8f22]:not(:last-child) {\n  border-bottom: 1px solid #eee;\n}\n.drill-modal .drill-modal-body[data-v-9d4f8f22] {\n  padding: 16px;\n  overflow: auto;\n}\n.drill-modal .drill-modal-body table[data-v-9d4f8f22] {\n  width: 100%;\n  border-collapse: collapse;\n}\n.drill-modal .drill-modal-body table th[data-v-9d4f8f22], .drill-modal .drill-modal-body table td[data-v-9d4f8f22] {\n  padding: 4px 8px;\n  border: 1px solid var(--st-pivottable-col-headers-border);\n  text-align: left;\n}\n.drill-modal .drill-modal-body table th[data-v-9d4f8f22] {\n  background: var(--st-dashboard-bg-2);\n  font-weight: 600;\n}\n.drill-modal .drill-modal-body table tr[data-v-9d4f8f22]:nth-child(even) {\n  /* background: #f9f9f9; */\n}\n.drill-modal .drill-modal-body table tr[data-v-9d4f8f22]:hover {\n  /* background: #f0f7ff; */\n}\n\n/*# sourceMappingURL=DrillThroughModal.vue.map */", map: {"version":3,"sources":["/Users/daniel/Documents/work/stipple_app/pivot-table/lib/src/components/DrillThroughModal.vue","DrillThroughModal.vue"],"names":[],"mappings":"AAsNA;EACA,eAAA;EACA,MAAA;EACA,OAAA;EACA,QAAA;EACA,SAAA;EACA,8BAAA;EACA,aAAA;EACA,mBAAA;EACA,uBAAA;EACA,aAAA;ACrNA;ADwNA;EACA,oCAAA;EACA,uBAAA;EACA,kBAAA;EACA,UAAA;EACA,iBAAA;EACA,gBAAA;EACA,aAAA;EACA,sBAAA;EACA,yCAAA;ACrNA;ADuNA;EACA,aAAA;EACA,gDAAA;EACA,aAAA;EACA,8BAAA;EACA,mBAAA;ACrNA;ADuNA;EACA,aAAA;EACA,mBAAA;EACA,SAAA;ACrNA;ADuNA;EACA,SAAA;EACA,eAAA;EACA,uBAAA;ACrNA;ADwNA;EACA,uBAAA;EACA,eAAA;ACtNA;AD0NA;EACA,aAAA;EACA,mBAAA;EACA,SAAA;ACxNA;AD2NA;EACA,gBAAA;EACA,YAAA;EACA,eAAA;EACA,eAAA;EACA,uBAAA;ACzNA;AD2NA;EACA,uBAAA;ACzNA;AD6NA;EACA,kBAAA;AC3NA;AD8NA;EACA,aAAA;EACA,mBAAA;EACA,QAAA;EACA,gBAAA;EACA,yCAAA;EACA,kBAAA;EACA,gEAAA;EACA,uBAAA;EACA,eAAA;EACA,eAAA;EACA,oBAAA;AC5NA;AD8NA;EACA,eAAA;AC5NA;AD+NA;EACA,gBAAA;EACA,0BAAA;AC7NA;AD+NA;EACA,yBAAA;AC7NA;ADiOA;EACA,iEAAA;AC/NA;ADmOA;EACA,kBAAA;EACA,SAAA;EACA,QAAA;EACA,eAAA;EACA,iBAAA;EACA,sBAAA;EACA,kBAAA;EACA,yCAAA;EACA,aAAA;EACA,gBAAA;ACjOA;ADmOA;EACA,aAAA;EACA,sBAAA;EACA,WAAA;EACA,iBAAA;EACA,YAAA;EACA,gBAAA;EACA,gBAAA;EACA,eAAA;EACA,2BAAA;ACjOA;ADmOA;EACA,gBAAA;EACA,WAAA;ACjOA;ADoOA;EACA,eAAA;EACA,WAAA;AClOA;ADqOA;EACA,mBAAA;ACnOA;ADsOA;EACA,6BAAA;ACpOA;AD0OA;EACA,aAAA;EACA,cAAA;ACxOA;AD0OA;EACA,WAAA;EACA,yBAAA;ACxOA;AD0OA;EACA,gBAAA;EACA,yDAAA;EACA,gBAAA;ACxOA;AD2OA;EACA,oCAAA;EACA,gBAAA;ACzOA;AD4OA;EACA,yBAAA;AC1OA;AD6OA;EACA,yBAAA;AC3OA;;AAEA,gDAAgD","file":"DrillThroughModal.vue","sourcesContent":["<template>\n    <div class=\"drill-modal-backdrop\" @click.self=\"$emit('close')\">\n        <div class=\"drill-modal\">\n            <div class=\"drill-modal-header\">\n                <div class=\"header-content\">\n                    <h3>{{ title }}</h3>\n                    <span class=\"record-count\">({{ data.length }} records)</span>\n                </div>\n                <div class=\"header-actions\">\n                    <div class=\"export-dropdown\" v-click-outside=\"closeExportMenu\">\n                        <button class=\"export-btn\" @click=\"toggleExportMenu\" title=\"Export data\">\n                            <span class=\"download-icon\">⬇</span> Export\n                            <span class=\"dropdown-arrow\" :class=\"{ 'open': showExportMenu }\">▾</span>\n                        </button>\n                        <div class=\"export-menu\" v-if=\"showExportMenu\">\n                            <button @click=\"downloadData('csv')\" class=\"menu-item\">\n                                <span class=\"format\">CSV</span>\n                                <span class=\"description\">Comma-separated values</span>\n                            </button>\n                            <button @click=\"downloadData('tsv')\" class=\"menu-item\">\n                                <span class=\"format\">TSV</span>\n                                <span class=\"description\">Tab-separated values</span>\n                            </button>\n                            <button @click=\"downloadData('json')\" class=\"menu-item\">\n                                <span class=\"format\">JSON</span>\n                                <span class=\"description\">JavaScript Object Notation</span>\n                            </button>\n                        </div>\n                    </div>\n                    <button class=\"close-btn\" @click=\"$emit('close')\">&times;</button>\n                </div>\n            </div>\n            <div class=\"drill-modal-body\">\n                <table>\n                    <thead>\n                        <tr>\n                            <th v-for=\"col in columns\" :key=\"col\">{{ col }}</th>\n                        </tr>\n                    </thead>\n                    <tbody>\n                        <tr v-for=\"(row, idx) in data\" :key=\"idx\">\n                            <td v-for=\"col in columns\" :key=\"col\">{{ row[col] }}</td>\n                        </tr>\n                    </tbody>\n                </table>\n            </div>\n        </div>\n    </div>\n</template>\n\n<script>\nexport default {\n    name: 'DrillThroughModal',\n    directives: {\n        'click-outside': {\n            bind(el, binding) {\n                el.clickOutsideEvent = function(event) {\n                    if (!(el === event.target || el.contains(event.target))) {\n                        binding.value(event);\n                    }\n                };\n                document.addEventListener('click', el.clickOutsideEvent);\n            },\n            unbind(el) {\n                document.removeEventListener('click', el.clickOutsideEvent);\n            }\n        }\n    },\n    props: {\n        data: {\n            type: Array,\n            required: true\n        },\n        columns: {\n            type: Array,\n            required: true\n        },\n        title: {\n            type: String,\n            required: true\n        }\n    },\n\n    data() {\n        return {\n            showExportMenu: false\n        };\n    },\n\n    mounted() {\n        // Add event listener for Escape key\n        document.addEventListener('keydown', this.handleKeyDown);\n    },\n\n    beforeDestroy() {\n        // Clean up event listener\n        document.removeEventListener('keydown', this.handleKeyDown);\n    },\n\n    methods: {\n        handleKeyDown(event) {\n            if (event.key === 'Escape') {\n                this.showExportMenu = false;\n                this.$emit('close');\n            }\n        },\n\n        toggleExportMenu() {\n            this.showExportMenu = !this.showExportMenu;\n        },\n\n        closeExportMenu() {\n            this.showExportMenu = false;\n        },\n\n        downloadData(format) {\n            let content;\n            let mimeType;\n            let extension;\n\n            switch (format) {\n                case 'csv':\n                    content = this.convertToCSV(',');\n                    mimeType = 'text/csv';\n                    extension = 'csv';\n                    break;\n                case 'tsv':\n                    content = this.convertToCSV('\\t');\n                    mimeType = 'text/tab-separated-values';\n                    extension = 'tsv';\n                    break;\n                case 'json':\n                    content = this.convertToJSON();\n                    mimeType = 'application/json';\n                    extension = 'json';\n                    break;\n                default:\n                    return;\n            }\n\n            // Create and trigger download\n            const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });\n            const link = document.createElement('a');\n            const url = URL.createObjectURL(blob);\n            \n            link.setAttribute('href', url);\n            link.setAttribute('download', this.getFileName(extension));\n            link.style.visibility = 'hidden';\n            \n            document.body.appendChild(link);\n            link.click();\n            document.body.removeChild(link);\n\n            // Close the export menu\n            this.showExportMenu = false;\n        },\n\n        convertToCSV(delimiter) {\n            // Add BOM for Excel UTF-8 compatibility\n            let csv = '\\ufeff';\n            \n            // Add headers\n            csv += this.columns.map(this.escapeField).join(delimiter) + '\\n';\n            \n            // Add data rows\n            csv += this.data.map(row => {\n                return this.columns.map(col => this.escapeField(row[col], delimiter)).join(delimiter);\n            }).join('\\n');\n            \n            return csv;\n        },\n\n        convertToJSON() {\n            // Convert data to array of objects with only the selected columns\n            const jsonData = this.data.map(row => {\n                const newRow = {};\n                this.columns.forEach(col => {\n                    newRow[col] = row[col];\n                });\n                return newRow;\n            });\n            \n            return JSON.stringify(jsonData, null, 2);\n        },\n\n        escapeField(field, delimiter = ',') {\n            if (field === null || field === undefined) {\n                return '';\n            }\n            \n            const stringField = String(field);\n            \n            // If the field contains quotes, delimiters, or newlines, wrap it in quotes and escape existing quotes\n            if (stringField.includes('\"') || stringField.includes(delimiter) || stringField.includes('\\n')) {\n                return `\"${stringField.replace(/\"/g, '\"\"')}\"`;\n            }\n            \n            return stringField;\n        },\n\n        getFileName(extension) {\n            const date = new Date().toISOString().split('T')[0];\n            const sanitizedTitle = this.title\n                .replace('Drill Through - ', '')\n                .replace(/[^a-z0-9]/gi, '_')\n                .replace(/_+/g, '_')\n                .toLowerCase();\n            return `${sanitizedTitle}_${date}.${extension}`;\n        }\n    }\n}\n</script>\n\n<style lang=\"scss\" scoped>\n.drill-modal-backdrop {\n    position: fixed;\n    top: 0;\n    left: 0;\n    right: 0;\n    bottom: 0;\n    background: rgba(0, 0, 0, 0.5);\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    z-index: 1000;\n}\n\n.drill-modal {\n    background: var(--st-dashboard-bg-1);\n    color: var(--st-text-1);\n    border-radius: 8px;\n    width: 90%;\n    max-width: 1200px;\n    max-height: 90vh;\n    display: flex;\n    flex-direction: column;\n    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);\n    \n    .drill-modal-header {\n        padding: 16px;\n        border-bottom: 1px solid var(--st-color-neutral);\n        display: flex;\n        justify-content: space-between;\n        align-items: center;\n        \n        .header-content {\n            display: flex;\n            align-items: center;\n            gap: 10px;\n            \n            h3 {\n                margin: 0;\n                font-size: 18px;\n                color: var(--st-text-1);\n            }\n            \n            .record-count {\n                color: var(--st-text-2);\n                font-size: 14px;\n            }\n        }\n\n        .header-actions {\n            display: flex;\n            align-items: center;\n            gap: 30px;\n        }\n        \n        .close-btn {\n            background: none;\n            border: none;\n            font-size: 24px;\n            cursor: pointer;\n            color: var(--st-text-2);\n            \n            &:hover {\n                color: var(--st-text-1);\n            }\n        }\n\n        .export-dropdown {\n            position: relative;\n        }\n\n        .export-btn {\n            display: flex;\n            align-items: center;\n            gap: 4px;\n            padding: 1px 6px;\n            border: 1px solid var(--st-color-neutral);\n            border-radius: 4px;\n            background: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n            color: var(--st-text-2);\n            font-size: 14px;\n            cursor: pointer;\n            transition: all 0.2s;\n\n            .download-icon {\n                font-size: 16px;\n            }\n\n            .dropdown-arrow {\n                margin-left: 4px;\n                transition: transform 0.2s;\n\n                &.open {\n                    transform: rotate(180deg);\n                }\n            }\n            \n            &:hover {\n                background: color-mix(in srgb, var(--st-text-1) 15%, transparent);;\n            }\n        }\n\n        .export-menu {\n            position: absolute;\n            top: 100%;\n            right: 0;\n            margin-top: 4px;\n            background: white;\n            border: 1px solid #ddd;\n            border-radius: 4px;\n            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);\n            z-index: 1000;\n            min-width: 200px;\n\n            .menu-item {\n                display: flex;\n                flex-direction: column;\n                width: 100%;\n                padding: 8px 12px;\n                border: none;\n                background: none;\n                text-align: left;\n                cursor: pointer;\n                transition: background 0.2s;\n\n                .format {\n                    font-weight: 500;\n                    color: #333;\n                }\n\n                .description {\n                    font-size: 12px;\n                    color: #666;\n                }\n\n                &:hover {\n                    background: #f5f5f5;\n                }\n\n                &:not(:last-child) {\n                    border-bottom: 1px solid #eee;\n                }\n            }\n        }\n    }\n    \n    .drill-modal-body {\n        padding: 16px;\n        overflow: auto;\n        \n        table {\n            width: 100%;\n            border-collapse: collapse;\n            \n            th, td {\n                padding: 4px 8px;\n                border: 1px solid var(--st-pivottable-col-headers-border);\n                text-align: left;\n            }\n            \n            th {\n                background: var(--st-dashboard-bg-2);\n                font-weight: 600;\n            }\n            \n            tr:nth-child(even) {\n                /* background: #f9f9f9; */\n            }\n            \n            tr:hover {\n                /* background: #f0f7ff; */\n            }\n        }\n    }\n}\n</style> ",".drill-modal-backdrop {\n  position: fixed;\n  top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  background: rgba(0, 0, 0, 0.5);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n\n.drill-modal {\n  background: var(--st-dashboard-bg-1);\n  color: var(--st-text-1);\n  border-radius: 8px;\n  width: 90%;\n  max-width: 1200px;\n  max-height: 90vh;\n  display: flex;\n  flex-direction: column;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);\n}\n.drill-modal .drill-modal-header {\n  padding: 16px;\n  border-bottom: 1px solid var(--st-color-neutral);\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}\n.drill-modal .drill-modal-header .header-content {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n}\n.drill-modal .drill-modal-header .header-content h3 {\n  margin: 0;\n  font-size: 18px;\n  color: var(--st-text-1);\n}\n.drill-modal .drill-modal-header .header-content .record-count {\n  color: var(--st-text-2);\n  font-size: 14px;\n}\n.drill-modal .drill-modal-header .header-actions {\n  display: flex;\n  align-items: center;\n  gap: 30px;\n}\n.drill-modal .drill-modal-header .close-btn {\n  background: none;\n  border: none;\n  font-size: 24px;\n  cursor: pointer;\n  color: var(--st-text-2);\n}\n.drill-modal .drill-modal-header .close-btn:hover {\n  color: var(--st-text-1);\n}\n.drill-modal .drill-modal-header .export-dropdown {\n  position: relative;\n}\n.drill-modal .drill-modal-header .export-btn {\n  display: flex;\n  align-items: center;\n  gap: 4px;\n  padding: 1px 6px;\n  border: 1px solid var(--st-color-neutral);\n  border-radius: 4px;\n  background: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n  color: var(--st-text-2);\n  font-size: 14px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.drill-modal .drill-modal-header .export-btn .download-icon {\n  font-size: 16px;\n}\n.drill-modal .drill-modal-header .export-btn .dropdown-arrow {\n  margin-left: 4px;\n  transition: transform 0.2s;\n}\n.drill-modal .drill-modal-header .export-btn .dropdown-arrow.open {\n  transform: rotate(180deg);\n}\n.drill-modal .drill-modal-header .export-btn:hover {\n  background: color-mix(in srgb, var(--st-text-1) 15%, transparent);\n}\n.drill-modal .drill-modal-header .export-menu {\n  position: absolute;\n  top: 100%;\n  right: 0;\n  margin-top: 4px;\n  background: white;\n  border: 1px solid #ddd;\n  border-radius: 4px;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);\n  z-index: 1000;\n  min-width: 200px;\n}\n.drill-modal .drill-modal-header .export-menu .menu-item {\n  display: flex;\n  flex-direction: column;\n  width: 100%;\n  padding: 8px 12px;\n  border: none;\n  background: none;\n  text-align: left;\n  cursor: pointer;\n  transition: background 0.2s;\n}\n.drill-modal .drill-modal-header .export-menu .menu-item .format {\n  font-weight: 500;\n  color: #333;\n}\n.drill-modal .drill-modal-header .export-menu .menu-item .description {\n  font-size: 12px;\n  color: #666;\n}\n.drill-modal .drill-modal-header .export-menu .menu-item:hover {\n  background: #f5f5f5;\n}\n.drill-modal .drill-modal-header .export-menu .menu-item:not(:last-child) {\n  border-bottom: 1px solid #eee;\n}\n.drill-modal .drill-modal-body {\n  padding: 16px;\n  overflow: auto;\n}\n.drill-modal .drill-modal-body table {\n  width: 100%;\n  border-collapse: collapse;\n}\n.drill-modal .drill-modal-body table th, .drill-modal .drill-modal-body table td {\n  padding: 4px 8px;\n  border: 1px solid var(--st-pivottable-col-headers-border);\n  text-align: left;\n}\n.drill-modal .drill-modal-body table th {\n  background: var(--st-dashboard-bg-2);\n  font-weight: 600;\n}\n.drill-modal .drill-modal-body table tr:nth-child(even) {\n  /* background: #f9f9f9; */\n}\n.drill-modal .drill-modal-body table tr:hover {\n  /* background: #f0f7ff; */\n}\n\n/*# sourceMappingURL=DrillThroughModal.vue.map */"]}, media: undefined });

    };
    /* scoped */
    const __vue_scope_id__$3 = "data-v-9d4f8f22";
    /* module identifier */
    const __vue_module_identifier__$3 = undefined;
    /* functional template */
    const __vue_is_functional_template__$3 = false;
    /* style inject SSR */
    
    /* style inject shadow dom */
    

    
    const __vue_component__$3 = /*#__PURE__*/normalizeComponent(
      { render: __vue_render__$3, staticRenderFns: __vue_staticRenderFns__$3 },
      __vue_inject_styles__$3,
      __vue_script__$3,
      __vue_scope_id__$3,
      __vue_is_functional_template__$3,
      __vue_module_identifier__$3,
      false,
      createInjector,
      undefined,
      undefined
    );

  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //

  var script$2 = {
    name: 'st-pivottable-controls',
    
    props: {
      data: {
        type: Array,
        required: true
      },
      rows: {
        type: Array,
        default: () => []
      },
      columns: {
        type: Array,
        default: () => []
      },
      values: {
        type: Array,
        default: () => []
      },
      filters: {
        type: Array,
        default: () => []
      },
      hasNoResults: {
        type: Boolean,
        default: false
      },
      filterResults: {
        type: Object,
        default: () => ({})
      }
    },

    data() {
      return {
        dragOverZone: null,
        isDragging: false,
        dragSourceZone: null,
        collapsedSections: {
          available: false,
          rows: false,
          columns: false,
          values: false,
          filters: false
        },
        showColumnSelect: false,
        selectedColumn: '',
        activeAddField: null,
        selectedField: '',
        searchQuery: '',
        filteredFields: [],
        nextValueId: 1,  // Counter for generating unique IDs
        internalFilters: [...(this.filters || [])],  // Initialize internalFilters
        config: {
          rows: this.rows.map(row => ({
            ...row,
            sortBy: row.sortBy || 'label',
            sortOrder: row.sortOrder || 'asc'
          })),
          columns: this.columns || [],
          values: (this.values || []).map((value, index) => {
            // Ensure each value has a unique ID using its position if no ID exists
            const id = value.id || `${value.field}_${value.aggregation}_${index + 1}`;
            return { ...value, id };
          })
        },
        uniqueValuesCache: {},
        isUpdatingConfig: false  // Add this flag to prevent recursive updates
      }
    },

    computed: {
      availableFields() {
        console.log('Computing availableFields');
        const fields = Object.keys(this.data[0] || {}).sort((a, b) => a.localeCompare(b));
        console.log('Available fields:', fields);
        return fields;
      },

      restrictedFields() {
        console.log('Computing restrictedFields');
        const usedFields = new Set([
          ...this.config.rows.map(f => f.field),
          ...this.config.columns.map(f => f.field)
        ]);
        console.log('Used fields:', Array.from(usedFields));
        const fields = this.availableFields.filter(field => !usedFields.has(field));
        console.log('Restricted fields:', fields);
        return fields;
      },

      availableColumns() {
        console.log('Computing availableColumns');
        const fields = Object.keys(this.data[0] || {}).sort((a, b) => a.localeCompare(b));
        console.log('Available columns:', fields);
        return fields;
      },

      filteredColumns() {
        console.log('Computing filteredColumns');
        const query = this.searchQuery.toLowerCase();
        const fields = this.availableColumns
          .filter(field => field.toLowerCase().includes(query))
          .sort((a, b) => a.localeCompare(b));
        console.log('Filtered columns:', fields);
        return fields;
      }
    },

    methods: {
      onDragStart(event, field, sourceZone = null) {
        this.isDragging = true;
        this.dragSourceZone = sourceZone;
        
        // Set data for transfer
        event.dataTransfer.setData('text/plain', field);
        event.dataTransfer.setData('source-zone', sourceZone || '');
        
        // If it's a Values or Filters item, only allow reordering within their own pod
        if (sourceZone === 'values' || sourceZone === 'filters') {
          event.dataTransfer.effectAllowed = 'copyMove';
        }

        // If dragging from within a zone, disable pointer events on other fields in that zone
        if (sourceZone) {
          const dropZone = event.target.closest('.drop-zone');
          const fields = dropZone.querySelectorAll('.field-item');
          fields.forEach(fieldEl => {
            if (fieldEl !== event.target) {
              fieldEl.style.pointerEvents = 'none';
            }
          });
        }
      },

      onDragEnd() {
        // Re-enable pointer events on all fields
        document.querySelectorAll('.field-item').forEach(fieldEl => {
          fieldEl.style.pointerEvents = '';
        });
        this.isDragging = false;
        this.dragSourceZone = null;
      },

      onDragOver(event, zone) {
        const sourceZone = this.dragSourceZone;
        
        // Prevent dropping Values items into other zones
        if (sourceZone === 'values' && zone !== 'values') {
          event.preventDefault();
          return;
        }
        
        // Prevent dropping Filters items into other zones
        if (sourceZone === 'filters' && zone !== 'filters') {
          event.preventDefault();
          return;
        }
        
        // Prevent dropping other items into Values or Filters zones
        if ((sourceZone !== 'values' && zone === 'values') || 
            (sourceZone !== 'filters' && zone === 'filters')) {
          event.preventDefault();
          return;
        }
        
        event.preventDefault();
        this.dragOverZone = zone;
        
        const dropZone = event.currentTarget;
        const fieldItems = Array.from(dropZone.querySelectorAll('.field-item'));
        
        if (fieldItems.length === 0) {
          // If no items, show indicator at the top
          this.dropPosition = 'top';
          this.dropIndicatorStyle = { top: '40px' };
          return;
        }

        // Find the insertion point
        let insertBefore = null;
        let insertIndex = 0;
        for (let i = 0; i < fieldItems.length; i++) {
          const rect = fieldItems[i].getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          
          if (event.clientY < midY) {
            insertBefore = fieldItems[i];
            insertIndex = i;
            break;
          }
        }

        if (insertBefore) {
          // Position indicator above this item
          const rect = insertBefore.getBoundingClientRect();
          const dropZoneRect = dropZone.getBoundingClientRect();
          const relativeTop = rect.top - dropZoneRect.top;
          this.dropIndicatorStyle = { top: `${relativeTop}px` };
          this.dropPosition = insertIndex === 0 ? 'top' : null;
        } else {
          // Position indicator at the bottom
          this.dropPosition = 'bottom';
          this.dropIndicatorStyle = null;
        }
      },

      onDrop(event, targetZone) {
        event.preventDefault();
        this.dragOverZone = null;
        
        const field = event.dataTransfer.getData('text/plain');
        const sourceZone = event.dataTransfer.getData('source-zone');
        
        // Prevent dropping Values items into other zones
        if (sourceZone === 'values' && targetZone !== 'values') {
          return;
        }
        
        // Prevent dropping Filters items into other zones
        if (sourceZone === 'filters' && targetZone !== 'filters') {
          return;
        }
        
        // Prevent dropping other items into Values or Filters zones
        if ((sourceZone !== 'values' && targetZone === 'values') || 
            (sourceZone !== 'filters' && targetZone === 'filters')) {
          return;
        }
        
        // Remove any drag-over classes
        const fieldItems = Array.from(event.currentTarget.querySelectorAll('.field-item'));
        fieldItems.forEach(item => item.classList.remove('drag-over-top', 'drag-over-bottom'));
        
        // Re-enable pointer events on all fields
        document.querySelectorAll('.field-item').forEach(fieldEl => {
          fieldEl.style.pointerEvents = '';
        });
        
        // If source and target zones are the same, handle reordering
        if (sourceZone === targetZone) {
          let items;
          let draggedItem;
          
          if (targetZone === 'filters') {
            items = [...this.internalFilters];
            draggedItem = items.find(f => f.field === field);
          } else {
            items = [...this.config[targetZone]];
            draggedItem = items.find(f => f.field === field);
          }
          
          if (!draggedItem) return;

          let insertIndex = items.length;
          
          for (let i = 0; i < fieldItems.length; i++) {
            const item = fieldItems[i];
            const box = item.getBoundingClientRect();
            const itemMiddle = box.top + box.height / 2;
            
            if (event.clientY < itemMiddle) {
              insertIndex = i;
              break;
            }
          }
          
          // Remove the dragged item from its current position
          const draggedIndex = items.indexOf(draggedItem);
          items.splice(draggedIndex, 1);
          items.splice(insertIndex, 0, draggedItem);
          
          // Update the appropriate array
          if (targetZone === 'filters') {
            this.$emit('filtersChanged', items);
          } else {
            this.isUpdatingConfig = true;
            try {
              this.config[targetZone] = items;
              this.$emit('configChanged', { ...this.config });
            } finally {
              this.isUpdatingConfig = false;
            }
          }
        } else if (targetZone !== 'values' && targetZone !== 'filters') {  // Only handle cross-pod drops for non-Values/non-Filters zones
          // Handle dropping between different zones (existing cross-pod logic)
          let draggedField;

          // Find the field in the source zone if it exists
          if (sourceZone && this.config[sourceZone]) {
            draggedField = this.config[sourceZone].find(f => f.field === field);
          }

          // If no dragged field found (from available fields) create a new one
          if (!draggedField) {
            draggedField = { field };
          }

          // Add default sort properties for rows
          if (targetZone === 'rows') {
            draggedField = {
              ...draggedField,
              sortBy: 'label',
              sortOrder: 'asc'
            };
          }

          // Remove from source zone if it exists
          if (sourceZone && this.config[sourceZone]) {
            const index = this.config[sourceZone].findIndex(f => f.field === field);
            if (index !== -1) {
              const newSourceFields = [...this.config[sourceZone]];
              newSourceFields.splice(index, 1);
              this.config[sourceZone] = newSourceFields;
            }
          }

          // Add to target zone
          this.isUpdatingConfig = true;
          try {
            this.config[targetZone] = [...this.config[targetZone], draggedField];
            this.$emit('configChanged', { ...this.config });
          } finally {
            this.isUpdatingConfig = false;
          }
        }
        
        this.isDragging = false;
        this.dragSourceZone = null;
        this.dropPosition = null;
        this.dropIndicatorStyle = null;
      },

      removeField(zone, field) {
        console.log('Removing field:', { zone, field });
        const index = this.config[zone].findIndex(f => f.field === field.field);
        if (index !== -1) {
          // Create a new array instead of modifying the existing one
          this.config[zone] = [
            ...this.config[zone].slice(0, index),
            ...this.config[zone].slice(index + 1)
          ];
          console.log('New config after removal:', this.config[zone]);
          this.$emit('configChanged', { ...this.config });
        }
      },

      toggleSection(section) {
        this.collapsedSections[section] = !this.collapsedSections[section];
      },

      removeFilter(filter) {
        const index = this.internalFilters.indexOf(filter);
        if (index !== -1) {
          this.internalFilters.splice(index, 1);
          this.$emit('filtersChanged', this.internalFilters);
          //this.onFilterChange();
        }
      },

      filterChanged() {
        console.log('st-pivottable-controls:filterChanged: ', this.internalFilters);
        // Create a new array with the updated filters to ensure reactivity
        const updatedFilters = [...this.internalFilters];
        this.$emit('filtersChanged', updatedFilters);
        //this.onFilterChange();
      },

      getInputType(column) {
        // Determine input type based on the first non-null value in the column
        const firstValue = this.data.find(row => row[column] != null)?.[column];
        if (typeof firstValue === 'number') return 'number';
        if (typeof firstValue === 'boolean') return 'checkbox';
        if (firstValue instanceof Date) return 'date';
        return 'text';
      },

      getDefaultCondition(column) {
        const firstValue = this.data.find(row => row[column] != null)?.[column];
        
        if (typeof firstValue === 'number') return 'equals';
        if (typeof firstValue === 'boolean') return 'equals';
        if (firstValue instanceof Date) return 'equals';
        return 'contains';
      },

      getDefaultValue(column) {
        const firstValue = this.data.find(row => row[column] != null)?.[column];
        
        if (typeof firstValue === 'number') return 0;
        if (typeof firstValue === 'boolean') return true;
        if (firstValue instanceof Date) return new Date().toISOString().split('T')[0];
        return '';
      },

      addNewFilter() {
        if (this.selectedColumn) {
          const newFilter = {
            field: this.selectedColumn,
            filterType: 'condition',
            condition: this.getDefaultCondition(this.selectedColumn),
            value: this.getDefaultValue(this.selectedColumn),
            selectedValues: []
          };
          // Create a new array with the new filter
          this.internalFilters = [...this.internalFilters, newFilter];
          console.log('st-pivottable-controls:addNewFilter: ', this.internalFilters);
          this.$emit('filtersChanged', this.internalFilters);
          
          this.selectedColumn = '';
          this.showColumnSelect = false;
          //this.onFilterChange();
        }
      },

      addNewField(zone) {
        console.log('Adding new field:', { zone, selectedField: this.selectedField });
        if (!this.selectedField) return;
        
        let newField = { field: this.selectedField };
        let newId;

        // Add zone-specific properties
        switch (zone) {
          case 'rows': {
            newField = {
              ...newField,
              sortBy: 'label',
              sortOrder: 'asc'
            };
            break;
          }
          case 'values': {
            // Determine best default aggregation based on field type
            const firstValue = this.data.find(row => row[this.selectedField] != null)?.[this.selectedField];
            const defaultAggregation = typeof firstValue === 'number' ? 'sum' : 'count';
            
            // Generate a unique ID based on the current values length plus 1
            newId = `${this.selectedField}_${defaultAggregation}_${this.config.values.length + 1}`;
            console.log('Creating new value field:', { field: this.selectedField, aggregation: defaultAggregation, id: newId });
            
            newField = {
              ...newField,
              aggregation: defaultAggregation,
              id: newId
            };
            break;
          }
        }
        
        // Create a new array instead of pushing to the existing one
        this.config[zone] = [...this.config[zone], newField];
        console.log('New config after addition:', this.config[zone]);
        
        // Emit the change with a new config object
        this.$emit('configChanged', { ...this.config });
        
        this.selectedField = '';
        this.activeAddField = null;
      },

      onSortChange() {
        console.log('Sort changed, emitting new config');
        this.$emit('configChanged', { ...this.config });
      },

      showFieldSelect(zone) {
        this.activeAddField = zone;
        this.searchQuery = '';
        // Initialize with appropriate field list based on zone
        this.filteredFields = (zone === 'rows' || zone === 'columns') 
          ? this.restrictedFields 
          : this.availableFields;
        this.$nextTick(() => {
          const searchInput = this.$refs.searchInput;
          if (searchInput) {
            searchInput.focus();
          }
        });
      },

      showFilterSelect() {
        this.showColumnSelect = true;
        this.searchQuery = '';
        // Show all fields for filters
        this.filteredFields = this.availableFields;
        this.$nextTick(() => {
          const searchInput = this.$refs.searchInput;
          if (searchInput) {
            searchInput.focus();
          }
        });
      },

      filterFields() {
        console.log('Filtering fields');
        const query = this.searchQuery.toLowerCase();
        const sourceFields = (this.activeAddField === 'rows' || this.activeAddField === 'columns')
          ? this.restrictedFields
          : this.availableFields;
        
        this.filteredFields = sourceFields
          .filter(field => field.toLowerCase().includes(query))
          .sort((a, b) => a.localeCompare(b));
        console.log('Filtered fields:', this.filteredFields);
      },

      closeDropdown() {
        if (this.activeAddField) {
          this.activeAddField = null;
        }
        if (this.showColumnSelect) {
          this.showColumnSelect = false;
        }
        this.selectedField = '';
        this.selectedColumn = '';
        this.searchQuery = '';
      },

      handleKeydown(event) {
        if (event.key === 'Escape') {
          this.closeDropdown();
        }
      },

      onAggregationChange(field) {
        if (field.aggregation === 'custom') {
          // Initialize formula if not exists
          if (!field.formula) {
            field.formula = '';
          }
          // Validate empty formula
          this.validateFormula(field);
        } else {
          // Clean up formula-related properties when switching back to standard aggregation
          delete field.formula;
          delete field.formulaError;
        }
        
        // Update the field's ID while maintaining its position in the values array
        const fieldIndex = this.config.values.findIndex(v => v.id === field.id);
        field.id = `${field.field}_${field.aggregation}_${fieldIndex + 1}`;
        
        // Create a new config object to ensure proper reactivity
        const newConfig = {
          ...this.config,
          values: this.config.values.map(v => v === field ? { ...field } : v)
        };
        
        // Emit the change with the new config
        this.$emit('configChanged', newConfig);
      },

      onLabelChange(field) {
        // Create a new config object to ensure proper reactivity
        const newConfig = {
          ...this.config,
          values: this.config.values.map(v => v === field ? { ...field } : v)
        };
        
        // Emit the change with the new config
        this.$emit('configChanged', newConfig);
      },

      toggleFilterType(filter) {
        filter.filterType = filter.filterType === 'condition' ? 'values' : 'condition';
        if (filter.filterType === 'values') {
          // Initialize all necessary properties for values filter type
          filter.selectedValues = [];
          filter.searchQuery = '';
        } else {
          filter.condition = this.getDefaultCondition(filter.field);
          filter.value = '';
        }
        this.filterChanged();
      },

      getUniqueValues(column) {
        if (!this.uniqueValuesCache[column]) {
          const values = new Set();
          this.data.forEach(row => {
            if (row[column] !== null && row[column] !== undefined) {
              values.add(row[column]);
            }
          });
          this.uniqueValuesCache[column] = Array.from(values).sort((a, b) => {
            return String(a).localeCompare(String(b));
          });
        }
        return this.uniqueValuesCache[column];
      },

      selectAllValues(filter) {
        filter.selectedValues = [...this.getUniqueValues(filter.field)];
        this.filterChanged();
      },

      clearValues(filter) {
        filter.selectedValues = [];
        this.filterChanged();
      },

      filteredValues(filter) {
        const values = this.getUniqueValues(filter.field);
        if (!filter.searchQuery) return values;
        
        const searchTerm = (filter.searchQuery || '').toLowerCase();
        return values.filter(value => 
          String(value).toLowerCase().includes(searchTerm)
        );
      },

      formatValue(value) {
        return typeof value === 'number' ? value.toLocaleString() : value;
      },

      validateAndUpdateFormula(field) {
        console.log('FORMULA_UPDATE: Validating formula:', field.formula);
        const isValid = this.validateFormula(field);
        
        if (isValid) {
          console.log('FORMULA_UPDATE: Formula is valid, updating config');
          // Create a new config object to ensure proper reactivity
          const newConfig = {
            ...this.config,
            values: this.config.values.map(v => v === field ? { ...field } : v)
          };
          
          // Emit the change with the new config
          this.$emit('configChanged', newConfig);
        }
      },

      validateFormula(field) {
        // Reset error state
        field.formulaError = null;
        
        if (!field.formula || !field.formula.trim()) {
          field.formulaError = 'Formula cannot be empty';
          return false;
        }

        // Extract field references from formula
        const fieldRefs = field.formula.match(/\{([^}]+)\}/g) || [];
        const functionCalls = field.formula.match(/\b(SUM|COUNT|COUNTA|COUNTUNIQUE|AVERAGE|MAX|MIN|MEDIAN|STDEV|STDEVP|VAR|VARP)\s*\{([^}]+)\}/g) || [];
        
        // Check if formula contains at least one field reference or function call
        if (fieldRefs.length === 0 && functionCalls.length === 0) {
          field.formulaError = 'Formula must reference at least one field using {fieldName} or a function call like SUM{fieldName}';
          return false;
        }

        // Validate that all referenced fields exist in source data
        const availableFields = Object.keys(this.data[0] || {});
        const allFieldRefs = [...fieldRefs];
        
        // Extract field references from function calls
        functionCalls.forEach(func => {
          const match = func.match(/\{([^}]+)\}/);
          if (match) {
            allFieldRefs.push(match[0]);
          }
        });

        // Validate all field references
        for (const ref of new Set(allFieldRefs)) {  // Use Set to remove duplicates
          const fieldName = ref.slice(1, -1); // Remove { }
          if (!availableFields.includes(fieldName)) {
            field.formulaError = `Field "${fieldName}" not found in source data`;
            return false;
          }
        }

        // Basic syntax validation (this can be enhanced later)
        try {
          // Replace field references and function calls with 1 for validation
          let testFormula = field.formula;
          
          // First replace function calls
          testFormula = testFormula.replace(/\b(SUM|COUNT|COUNTA|COUNTUNIQUE|AVERAGE|MAX|MIN|MEDIAN|STDEV|STDEVP|VAR|VARP)\s*\{[^}]+\}/g, '1');
          
          // Then replace remaining field references
          testFormula = testFormula.replace(/\{[^}]+\}/g, '1');
          
          // Use Function instead of eval for safer evaluation
          new Function(`return ${testFormula}`)();
          return true;
        } catch (error) {
          field.formulaError = 'Invalid formula syntax';
          return false;
        }
      },

      exportData() {
          this.$emit('export');
      }
    },

    mounted() {
      document.addEventListener('keydown', this.handleKeydown);
    },

    beforeDestroy() {
      document.removeEventListener('keydown', this.handleKeydown);
    },

    watch: {
      rows: {
        handler(newRows) {
          if (this.isUpdatingConfig) return;  // Skip if already updating
          
          this.isUpdatingConfig = true;
          try {
            this.config.rows = newRows.map(row => ({
              ...row,
              sortBy: row.sortBy || 'label',
              sortOrder: row.sortOrder || 'asc'
            }));
          } finally {
            this.isUpdatingConfig = false;
          }
        },
        deep: true
      },
      columns: {
        handler(newColumns) {
          if (this.isUpdatingConfig) return;  // Skip if already updating
          
          this.isUpdatingConfig = true;
          try {
            this.config.columns = newColumns;
          } finally {
            this.isUpdatingConfig = false;
          }
        },
        deep: true
      },
      values: {
        handler(newValues) {
          if (this.isUpdatingConfig) return;  // Skip if already updating
          
          this.isUpdatingConfig = true;
          try {
            this.config.values = newValues.map(value => ({
              ...value,
              id: value.id || `${value.field}_${value.aggregation}_${this.nextValueId++}`
            }));
          } finally {
            this.isUpdatingConfig = false;
          }
        },
        deep: true
      },
      filters: {
        handler(newFilters) {
          console.log('[PV Controls] watch.filters.handler: ', newFilters);
          if (this.isUpdatingConfig) return;  // Skip if already updating
          
          this.isUpdatingConfig = true;
          try {
            this.internalFilters = [...newFilters];
          } finally {
            this.isUpdatingConfig = false;
          }
        },
        deep: true
      }
    }
  };

  /* script */
  const __vue_script__$2 = script$2;

  /* template */
  var __vue_render__$2 = function () {
    var _vm = this;
    var _h = _vm.$createElement;
    var _c = _vm._self._c || _h;
    return _c("div", { staticClass: "fields-container" }, [
      _c("div", { staticClass: "zones-container" }, [
        _c(
          "div",
          {
            staticClass: "drop-zone section",
            class: { "drag-over": _vm.dragOverZone === "rows" },
            attrs: { "data-zone": "rows" },
            on: {
              dragover: function ($event) {
                $event.preventDefault();
                return _vm.onDragOver($event, "rows")
              },
              dragleave: function ($event) {
                _vm.dragOverZone = null;
              },
              drop: function ($event) {
                return _vm.onDrop($event, "rows")
              },
            },
          },
          [
            _c(
              "div",
              {
                staticClass: "section-header",
                on: {
                  click: function ($event) {
                    return _vm.toggleSection("rows")
                  },
                },
              },
              [
                _c("h4", [_vm._v("Rows")]),
                _vm._v(" "),
                _c("div", { staticClass: "header-controls" }, [
                  _c(
                    "button",
                    {
                      staticClass: "add-btn",
                      attrs: { title: "Add Row" },
                      on: {
                        click: function ($event) {
                          $event.stopPropagation();
                          return _vm.showFieldSelect("rows")
                        },
                      },
                    },
                    [_vm._v("\n            +\n          ")]
                  ),
                  _vm._v(" "),
                  _c(
                    "span",
                    {
                      staticClass: "toggle-icon",
                      class: { collapsed: _vm.collapsedSections.rows },
                    },
                    [_vm._v("▼")]
                  ),
                ]),
              ]
            ),
            _vm._v(" "),
            _c(
              "div",
              {
                staticClass: "section-content",
                class: { collapsed: _vm.collapsedSections.rows },
              },
              [
                _vm._l(_vm.config.rows, function (field) {
                  return _c(
                    "div",
                    {
                      key: field.field,
                      staticClass: "field-item dropped",
                      attrs: { draggable: "true" },
                      on: {
                        dragstart: function ($event) {
                          return _vm.onDragStart($event, field.field, "rows")
                        },
                        dragend: _vm.onDragEnd,
                      },
                    },
                    [
                      _c("div", { staticClass: "field-content" }, [
                        _c("span", [_vm._v(_vm._s(field.field))]),
                        _vm._v(" "),
                        _c("div", { staticClass: "field-controls" }, [
                          _c(
                            "select",
                            {
                              directives: [
                                {
                                  name: "model",
                                  rawName: "v-model",
                                  value: field.sortBy,
                                  expression: "field.sortBy",
                                },
                              ],
                              staticClass: "sort-select",
                              on: {
                                change: [
                                  function ($event) {
                                    var $$selectedVal = Array.prototype.filter
                                      .call($event.target.options, function (o) {
                                        return o.selected
                                      })
                                      .map(function (o) {
                                        var val =
                                          "_value" in o ? o._value : o.value;
                                        return val
                                      });
                                    _vm.$set(
                                      field,
                                      "sortBy",
                                      $event.target.multiple
                                        ? $$selectedVal
                                        : $$selectedVal[0]
                                    );
                                  },
                                  function ($event) {
                                    return _vm.onSortChange(field)
                                  },
                                ],
                              },
                            },
                            [
                              _c("option", { attrs: { value: "label" } }, [
                                _vm._v("Label"),
                              ]),
                              _vm._v(" "),
                              _vm._l(_vm.config.values, function (value) {
                                return _c(
                                  "option",
                                  {
                                    key:
                                      value.id ||
                                      value.field + "_" + value.aggregation,
                                    domProps: {
                                      value:
                                        value.field +
                                        "_" +
                                        value.aggregation.toLowerCase(),
                                    },
                                  },
                                  [
                                    _vm._v(
                                      "\n                  " +
                                        _vm._s(value.field) +
                                        " (" +
                                        _vm._s(value.aggregation) +
                                        ")\n                "
                                    ),
                                  ]
                                )
                              }),
                            ],
                            2
                          ),
                          _vm._v(" "),
                          _c(
                            "select",
                            {
                              directives: [
                                {
                                  name: "model",
                                  rawName: "v-model",
                                  value: field.sortOrder,
                                  expression: "field.sortOrder",
                                },
                              ],
                              staticClass: "order-select",
                              on: {
                                change: [
                                  function ($event) {
                                    var $$selectedVal = Array.prototype.filter
                                      .call($event.target.options, function (o) {
                                        return o.selected
                                      })
                                      .map(function (o) {
                                        var val =
                                          "_value" in o ? o._value : o.value;
                                        return val
                                      });
                                    _vm.$set(
                                      field,
                                      "sortOrder",
                                      $event.target.multiple
                                        ? $$selectedVal
                                        : $$selectedVal[0]
                                    );
                                  },
                                  function ($event) {
                                    return _vm.onSortChange(field)
                                  },
                                ],
                              },
                            },
                            [
                              _c("option", { attrs: { value: "asc" } }, [
                                _vm._v("Ascending"),
                              ]),
                              _vm._v(" "),
                              _c("option", { attrs: { value: "desc" } }, [
                                _vm._v("Descending"),
                              ]),
                            ]
                          ),
                          _vm._v(" "),
                          _c(
                            "button",
                            {
                              staticClass: "remove-btn",
                              on: {
                                click: function ($event) {
                                  return _vm.removeField("rows", field)
                                },
                              },
                            },
                            [_vm._v("×")]
                          ),
                        ]),
                      ]),
                    ]
                  )
                }),
                _vm._v(" "),
                _vm.activeAddField === "rows"
                  ? _c("div", { staticClass: "field-select-container" }, [
                      _c("input", {
                        directives: [
                          {
                            name: "model",
                            rawName: "v-model",
                            value: _vm.searchQuery,
                            expression: "searchQuery",
                          },
                        ],
                        ref: "searchInput",
                        staticClass: "field-search",
                        attrs: {
                          type: "text",
                          placeholder: "Search fields...",
                          autofocus: "",
                        },
                        domProps: { value: _vm.searchQuery },
                        on: {
                          input: [
                            function ($event) {
                              if ($event.target.composing) {
                                return
                              }
                              _vm.searchQuery = $event.target.value;
                            },
                            _vm.filterFields,
                          ],
                        },
                      }),
                      _vm._v(" "),
                      _c(
                        "select",
                        {
                          directives: [
                            {
                              name: "model",
                              rawName: "v-model",
                              value: _vm.selectedField,
                              expression: "selectedField",
                            },
                          ],
                          ref: "rowsSelect",
                          staticClass: "field-select expanded",
                          attrs: { size: "6" },
                          on: {
                            change: [
                              function ($event) {
                                var $$selectedVal = Array.prototype.filter
                                  .call($event.target.options, function (o) {
                                    return o.selected
                                  })
                                  .map(function (o) {
                                    var val = "_value" in o ? o._value : o.value;
                                    return val
                                  });
                                _vm.selectedField = $event.target.multiple
                                  ? $$selectedVal
                                  : $$selectedVal[0];
                              },
                              function ($event) {
                                return _vm.addNewField("rows")
                              },
                            ],
                          },
                        },
                        [
                          _c("option", { attrs: { value: "", disabled: "" } }, [
                            _vm._v("Select a field..."),
                          ]),
                          _vm._v(" "),
                          _vm._l(_vm.filteredFields, function (field, index) {
                            return _c(
                              "option",
                              {
                                key: field + "_" + index,
                                domProps: { value: field },
                              },
                              [
                                _vm._v(
                                  "\n              " +
                                    _vm._s(field) +
                                    "\n            "
                                ),
                              ]
                            )
                          }),
                        ],
                        2
                      ),
                      _vm._v(" "),
                      _c(
                        "button",
                        {
                          staticClass: "cancel-btn",
                          on: {
                            click: function ($event) {
                              _vm.activeAddField = null;
                            },
                          },
                        },
                        [_vm._v("×")]
                      ),
                    ])
                  : _vm._e(),
              ],
              2
            ),
          ]
        ),
        _vm._v(" "),
        _c(
          "div",
          {
            staticClass: "drop-zone section",
            class: { "drag-over": _vm.dragOverZone === "columns" },
            attrs: { "data-zone": "columns" },
            on: {
              dragover: function ($event) {
                $event.preventDefault();
                return _vm.onDragOver($event, "columns")
              },
              dragleave: function ($event) {
                _vm.dragOverZone = null;
              },
              drop: function ($event) {
                return _vm.onDrop($event, "columns")
              },
            },
          },
          [
            _c(
              "div",
              {
                staticClass: "section-header",
                on: {
                  click: function ($event) {
                    return _vm.toggleSection("columns")
                  },
                },
              },
              [
                _c("h4", [_vm._v("Columns")]),
                _vm._v(" "),
                _c("div", { staticClass: "header-controls" }, [
                  _c(
                    "button",
                    {
                      staticClass: "add-btn",
                      attrs: { title: "Add Column" },
                      on: {
                        click: function ($event) {
                          $event.stopPropagation();
                          return _vm.showFieldSelect("columns")
                        },
                      },
                    },
                    [_vm._v("\n            +\n          ")]
                  ),
                  _vm._v(" "),
                  _c(
                    "span",
                    {
                      staticClass: "toggle-icon",
                      class: { collapsed: _vm.collapsedSections.columns },
                    },
                    [_vm._v("▼")]
                  ),
                ]),
              ]
            ),
            _vm._v(" "),
            _c(
              "div",
              {
                staticClass: "section-content",
                class: { collapsed: _vm.collapsedSections.columns },
              },
              [
                _vm._l(_vm.config.columns, function (field) {
                  return _c(
                    "div",
                    {
                      key: field.field,
                      staticClass: "field-item dropped",
                      attrs: { draggable: "true" },
                      on: {
                        dragstart: function ($event) {
                          return _vm.onDragStart($event, field.field, "columns")
                        },
                        dragend: _vm.onDragEnd,
                      },
                    },
                    [
                      _c("div", { staticClass: "field-content" }, [
                        _c("span", [_vm._v(_vm._s(field.field))]),
                        _vm._v(" "),
                        _c("div", { staticClass: "field-controls" }, [
                          _c(
                            "select",
                            {
                              directives: [
                                {
                                  name: "model",
                                  rawName: "v-model",
                                  value: field.sortBy,
                                  expression: "field.sortBy",
                                },
                              ],
                              staticClass: "sort-select",
                              on: {
                                change: [
                                  function ($event) {
                                    var $$selectedVal = Array.prototype.filter
                                      .call($event.target.options, function (o) {
                                        return o.selected
                                      })
                                      .map(function (o) {
                                        var val =
                                          "_value" in o ? o._value : o.value;
                                        return val
                                      });
                                    _vm.$set(
                                      field,
                                      "sortBy",
                                      $event.target.multiple
                                        ? $$selectedVal
                                        : $$selectedVal[0]
                                    );
                                  },
                                  function ($event) {
                                    return _vm.onSortChange(field)
                                  },
                                ],
                              },
                            },
                            [
                              _c("option", { attrs: { value: "label" } }, [
                                _vm._v("Label"),
                              ]),
                              _vm._v(" "),
                              _vm._l(_vm.config.values, function (value) {
                                return _c(
                                  "option",
                                  {
                                    key:
                                      value.id ||
                                      value.field + "_" + value.aggregation,
                                    domProps: {
                                      value:
                                        value.field +
                                        "_" +
                                        value.aggregation.toLowerCase(),
                                    },
                                  },
                                  [
                                    _vm._v(
                                      "\n                  " +
                                        _vm._s(value.field) +
                                        " (" +
                                        _vm._s(value.aggregation) +
                                        ")\n                "
                                    ),
                                  ]
                                )
                              }),
                            ],
                            2
                          ),
                          _vm._v(" "),
                          _c(
                            "select",
                            {
                              directives: [
                                {
                                  name: "model",
                                  rawName: "v-model",
                                  value: field.sortOrder,
                                  expression: "field.sortOrder",
                                },
                              ],
                              staticClass: "order-select",
                              on: {
                                change: [
                                  function ($event) {
                                    var $$selectedVal = Array.prototype.filter
                                      .call($event.target.options, function (o) {
                                        return o.selected
                                      })
                                      .map(function (o) {
                                        var val =
                                          "_value" in o ? o._value : o.value;
                                        return val
                                      });
                                    _vm.$set(
                                      field,
                                      "sortOrder",
                                      $event.target.multiple
                                        ? $$selectedVal
                                        : $$selectedVal[0]
                                    );
                                  },
                                  function ($event) {
                                    return _vm.onSortChange(field)
                                  },
                                ],
                              },
                            },
                            [
                              _c("option", { attrs: { value: "asc" } }, [
                                _vm._v("Ascending"),
                              ]),
                              _vm._v(" "),
                              _c("option", { attrs: { value: "desc" } }, [
                                _vm._v("Descending"),
                              ]),
                            ]
                          ),
                          _vm._v(" "),
                          _c(
                            "button",
                            {
                              staticClass: "remove-btn",
                              on: {
                                click: function ($event) {
                                  return _vm.removeField("columns", field)
                                },
                              },
                            },
                            [_vm._v("×")]
                          ),
                        ]),
                      ]),
                    ]
                  )
                }),
                _vm._v(" "),
                _vm.activeAddField === "columns"
                  ? _c("div", { staticClass: "field-select-container" }, [
                      _c("input", {
                        directives: [
                          {
                            name: "model",
                            rawName: "v-model",
                            value: _vm.searchQuery,
                            expression: "searchQuery",
                          },
                        ],
                        ref: "searchInput",
                        staticClass: "field-search",
                        attrs: {
                          type: "text",
                          placeholder: "Search fields...",
                          autofocus: "",
                        },
                        domProps: { value: _vm.searchQuery },
                        on: {
                          input: [
                            function ($event) {
                              if ($event.target.composing) {
                                return
                              }
                              _vm.searchQuery = $event.target.value;
                            },
                            _vm.filterFields,
                          ],
                        },
                      }),
                      _vm._v(" "),
                      _c(
                        "select",
                        {
                          directives: [
                            {
                              name: "model",
                              rawName: "v-model",
                              value: _vm.selectedField,
                              expression: "selectedField",
                            },
                          ],
                          ref: "columnsSelect",
                          staticClass: "field-select expanded",
                          attrs: { size: "6" },
                          on: {
                            change: [
                              function ($event) {
                                var $$selectedVal = Array.prototype.filter
                                  .call($event.target.options, function (o) {
                                    return o.selected
                                  })
                                  .map(function (o) {
                                    var val = "_value" in o ? o._value : o.value;
                                    return val
                                  });
                                _vm.selectedField = $event.target.multiple
                                  ? $$selectedVal
                                  : $$selectedVal[0];
                              },
                              function ($event) {
                                return _vm.addNewField("columns")
                              },
                            ],
                          },
                        },
                        [
                          _c("option", { attrs: { value: "", disabled: "" } }, [
                            _vm._v("Select a field..."),
                          ]),
                          _vm._v(" "),
                          _vm._l(_vm.filteredFields, function (field, index) {
                            return _c(
                              "option",
                              {
                                key: field + "_" + index,
                                domProps: { value: field },
                              },
                              [
                                _vm._v(
                                  "\n              " +
                                    _vm._s(field) +
                                    "\n            "
                                ),
                              ]
                            )
                          }),
                        ],
                        2
                      ),
                      _vm._v(" "),
                      _c(
                        "button",
                        {
                          staticClass: "cancel-btn",
                          on: {
                            click: function ($event) {
                              _vm.activeAddField = null;
                            },
                          },
                        },
                        [_vm._v("×")]
                      ),
                    ])
                  : _vm._e(),
              ],
              2
            ),
          ]
        ),
        _vm._v(" "),
        _c(
          "div",
          {
            staticClass: "drop-zone section",
            class: { "drag-over": _vm.dragOverZone === "values" },
            attrs: { "data-zone": "values" },
            on: {
              dragover: function ($event) {
                $event.preventDefault();
                return _vm.onDragOver($event, "values")
              },
              dragleave: function ($event) {
                _vm.dragOverZone = null;
              },
              drop: function ($event) {
                return _vm.onDrop($event, "values")
              },
            },
          },
          [
            _c(
              "div",
              {
                staticClass: "section-header",
                on: {
                  click: function ($event) {
                    return _vm.toggleSection("values")
                  },
                },
              },
              [
                _c("h4", [_vm._v("Values")]),
                _vm._v(" "),
                _c("div", { staticClass: "header-controls" }, [
                  _c(
                    "button",
                    {
                      staticClass: "add-btn",
                      attrs: { title: "Add Value" },
                      on: {
                        click: function ($event) {
                          $event.stopPropagation();
                          return _vm.showFieldSelect("values")
                        },
                      },
                    },
                    [_vm._v("\n            +\n          ")]
                  ),
                  _vm._v(" "),
                  _c(
                    "span",
                    {
                      staticClass: "toggle-icon",
                      class: { collapsed: _vm.collapsedSections.values },
                    },
                    [_vm._v("▼")]
                  ),
                ]),
              ]
            ),
            _vm._v(" "),
            _c(
              "div",
              {
                staticClass: "section-content",
                class: { collapsed: _vm.collapsedSections.values },
              },
              [
                _vm._l(_vm.config.values, function (field) {
                  return _c(
                    "div",
                    {
                      key: field.id,
                      staticClass: "field-item dropped",
                      attrs: { draggable: "true" },
                      on: {
                        dragstart: function ($event) {
                          return _vm.onDragStart($event, field.field, "values")
                        },
                        dragend: _vm.onDragEnd,
                      },
                    },
                    [
                      _c("div", { staticClass: "field-content" }, [
                        _vm._v(
                          "\n            " +
                            _vm._s(field.field) +
                            "\n            "
                        ),
                        _c(
                          "select",
                          {
                            directives: [
                              {
                                name: "model",
                                rawName: "v-model",
                                value: field.aggregation,
                                expression: "field.aggregation",
                              },
                            ],
                            on: {
                              change: [
                                function ($event) {
                                  var $$selectedVal = Array.prototype.filter
                                    .call($event.target.options, function (o) {
                                      return o.selected
                                    })
                                    .map(function (o) {
                                      var val = "_value" in o ? o._value : o.value;
                                      return val
                                    });
                                  _vm.$set(
                                    field,
                                    "aggregation",
                                    $event.target.multiple
                                      ? $$selectedVal
                                      : $$selectedVal[0]
                                  );
                                },
                                function ($event) {
                                  return _vm.onAggregationChange(field)
                                },
                              ],
                            },
                          },
                          [
                            _c("option", { attrs: { value: "sum" } }, [
                              _vm._v("SUM"),
                            ]),
                            _vm._v(" "),
                            _c("option", { attrs: { value: "counta" } }, [
                              _vm._v("COUNTA"),
                            ]),
                            _vm._v(" "),
                            _c("option", { attrs: { value: "count" } }, [
                              _vm._v("COUNT"),
                            ]),
                            _vm._v(" "),
                            _c("option", { attrs: { value: "countunique" } }, [
                              _vm._v("COUNTUNIQUE"),
                            ]),
                            _vm._v(" "),
                            _c("option", { attrs: { value: "average" } }, [
                              _vm._v("AVERAGE"),
                            ]),
                            _vm._v(" "),
                            _c("option", { attrs: { value: "max" } }, [
                              _vm._v("MAX"),
                            ]),
                            _vm._v(" "),
                            _c("option", { attrs: { value: "min" } }, [
                              _vm._v("MIN"),
                            ]),
                            _vm._v(" "),
                            _c("option", { attrs: { value: "median" } }, [
                              _vm._v("MEDIAN"),
                            ]),
                            _vm._v(" "),
                            _c("option", { attrs: { value: "stdev" } }, [
                              _vm._v("STDEV"),
                            ]),
                            _vm._v(" "),
                            _c("option", { attrs: { value: "stdevp" } }, [
                              _vm._v("STDEVP"),
                            ]),
                            _vm._v(" "),
                            _c("option", { attrs: { value: "var" } }, [
                              _vm._v("VAR"),
                            ]),
                            _vm._v(" "),
                            _c("option", { attrs: { value: "varp" } }, [
                              _vm._v("VARP"),
                            ]),
                            _vm._v(" "),
                            _c("option", { attrs: { value: "custom" } }, [
                              _vm._v("Custom Formula"),
                            ]),
                          ]
                        ),
                        _vm._v(" "),
                        _c("input", {
                          directives: [
                            {
                              name: "model",
                              rawName: "v-model",
                              value: field.label,
                              expression: "field.label",
                            },
                          ],
                          staticClass: "label-input",
                          attrs: {
                            type: "text",
                            placeholder: "Custom label (optional)",
                          },
                          domProps: { value: field.label },
                          on: {
                            input: [
                              function ($event) {
                                if ($event.target.composing) {
                                  return
                                }
                                _vm.$set(field, "label", $event.target.value);
                              },
                              function ($event) {
                                return _vm.onLabelChange(field)
                              },
                            ],
                          },
                        }),
                        _vm._v(" "),
                        field.aggregation === "custom"
                          ? _c(
                              "div",
                              { staticClass: "formula-input-container" },
                              [
                                _c("input", {
                                  directives: [
                                    {
                                      name: "model",
                                      rawName: "v-model",
                                      value: field.formula,
                                      expression: "field.formula",
                                    },
                                  ],
                                  staticClass: "formula-input",
                                  class: { error: field.formulaError },
                                  attrs: {
                                    type: "text",
                                    placeholder:
                                      "Enter formula (e.g. {Revenue} - {Costs})",
                                  },
                                  domProps: { value: field.formula },
                                  on: {
                                    input: [
                                      function ($event) {
                                        if ($event.target.composing) {
                                          return
                                        }
                                        _vm.$set(
                                          field,
                                          "formula",
                                          $event.target.value
                                        );
                                      },
                                      function ($event) {
                                        return _vm.validateAndUpdateFormula(field)
                                      },
                                    ],
                                  },
                                }),
                                _vm._v(" "),
                                field.formulaError
                                  ? _c("div", { staticClass: "formula-error" }, [
                                      _vm._v(
                                        "\n                " +
                                          _vm._s(field.formulaError) +
                                          "\n              "
                                      ),
                                    ])
                                  : _vm._e(),
                              ]
                            )
                          : _vm._e(),
                        _vm._v(" "),
                        _c(
                          "button",
                          {
                            staticClass: "remove-btn",
                            on: {
                              click: function ($event) {
                                return _vm.removeField("values", field)
                              },
                            },
                          },
                          [_vm._v("×")]
                        ),
                      ]),
                    ]
                  )
                }),
                _vm._v(" "),
                _vm.activeAddField === "values"
                  ? _c("div", { staticClass: "field-select-container" }, [
                      _c("input", {
                        directives: [
                          {
                            name: "model",
                            rawName: "v-model",
                            value: _vm.searchQuery,
                            expression: "searchQuery",
                          },
                        ],
                        ref: "searchInput",
                        staticClass: "field-search",
                        attrs: {
                          type: "text",
                          placeholder: "Search fields...",
                          autofocus: "",
                        },
                        domProps: { value: _vm.searchQuery },
                        on: {
                          input: [
                            function ($event) {
                              if ($event.target.composing) {
                                return
                              }
                              _vm.searchQuery = $event.target.value;
                            },
                            _vm.filterFields,
                          ],
                        },
                      }),
                      _vm._v(" "),
                      _c(
                        "select",
                        {
                          directives: [
                            {
                              name: "model",
                              rawName: "v-model",
                              value: _vm.selectedField,
                              expression: "selectedField",
                            },
                          ],
                          ref: "valuesSelect",
                          staticClass: "field-select expanded",
                          attrs: { size: "6" },
                          on: {
                            change: [
                              function ($event) {
                                var $$selectedVal = Array.prototype.filter
                                  .call($event.target.options, function (o) {
                                    return o.selected
                                  })
                                  .map(function (o) {
                                    var val = "_value" in o ? o._value : o.value;
                                    return val
                                  });
                                _vm.selectedField = $event.target.multiple
                                  ? $$selectedVal
                                  : $$selectedVal[0];
                              },
                              function ($event) {
                                return _vm.addNewField("values")
                              },
                            ],
                          },
                        },
                        [
                          _c("option", { attrs: { value: "", disabled: "" } }, [
                            _vm._v("Select a field..."),
                          ]),
                          _vm._v(" "),
                          _vm._l(_vm.filteredFields, function (field, index) {
                            return _c(
                              "option",
                              {
                                key: field + "_" + index,
                                domProps: { value: field },
                              },
                              [
                                _vm._v(
                                  "\n              " +
                                    _vm._s(field) +
                                    "\n            "
                                ),
                              ]
                            )
                          }),
                        ],
                        2
                      ),
                      _vm._v(" "),
                      _c(
                        "button",
                        {
                          staticClass: "cancel-btn",
                          on: {
                            click: function ($event) {
                              _vm.activeAddField = null;
                            },
                          },
                        },
                        [_vm._v("×")]
                      ),
                    ])
                  : _vm._e(),
              ],
              2
            ),
          ]
        ),
        _vm._v(" "),
        _c(
          "div",
          {
            staticClass: "drop-zone section",
            class: {
              "drag-over": _vm.dragOverZone === "filters",
            },
            attrs: { "data-zone": "filters" },
            on: {
              dragover: function ($event) {
                $event.preventDefault();
                return _vm.onDragOver($event, "filters")
              },
              dragleave: function ($event) {
                _vm.dragOverZone = null;
              },
              drop: function ($event) {
                return _vm.onDrop($event, "filters")
              },
            },
          },
          [
            _c(
              "div",
              {
                staticClass: "section-header",
                on: {
                  click: function ($event) {
                    return _vm.toggleSection("filters")
                  },
                },
              },
              [
                _c("h4", [_vm._v("Filters")]),
                _vm._v(" "),
                _c("div", { staticClass: "header-controls" }, [
                  _c(
                    "button",
                    {
                      staticClass: "add-btn",
                      attrs: { title: "Add Filter" },
                      on: {
                        click: function ($event) {
                          $event.stopPropagation();
                          return _vm.showFilterSelect.apply(null, arguments)
                        },
                      },
                    },
                    [_vm._v("\n            +\n          ")]
                  ),
                  _vm._v(" "),
                  _c(
                    "span",
                    {
                      staticClass: "toggle-icon",
                      class: { collapsed: _vm.collapsedSections.filters },
                    },
                    [_vm._v("▼")]
                  ),
                ]),
              ]
            ),
            _vm._v(" "),
            _c(
              "div",
              {
                staticClass: "section-content",
                class: { collapsed: _vm.collapsedSections.filters },
              },
              [
                _vm._l(_vm.filters, function (filter, index) {
                  return _c(
                    "div",
                    {
                      key: "filter_" + filter.field + "_" + index,
                      staticClass: "field-item dropped",
                      class: {
                        "field-item": true,
                        dropped: true,
                        "has-no-results": !_vm.filterResults[filter.field],
                      },
                      attrs: { draggable: "true" },
                      on: {
                        dragstart: function ($event) {
                          return _vm.onDragStart($event, filter.field, "filters")
                        },
                        dragend: _vm.onDragEnd,
                      },
                    },
                    [
                      _c("div", { staticClass: "field-content" }, [
                        _c("div", { staticClass: "field-header" }, [
                          _c("span", { staticClass: "field-name" }, [
                            _vm._v(_vm._s(filter.field)),
                          ]),
                        ]),
                        _vm._v(" "),
                        _c("div", { staticClass: "filter-type-selector" }, [
                          _c(
                            "button",
                            {
                              staticClass: "filter-type-btn",
                              class: {
                                active: filter.filterType === "condition",
                              },
                              on: {
                                click: function ($event) {
                                  return _vm.toggleFilterType(filter)
                                },
                              },
                            },
                            [
                              _vm._v(
                                "\n                Condition\n              "
                              ),
                            ]
                          ),
                          _vm._v(" "),
                          _c(
                            "button",
                            {
                              staticClass: "filter-type-btn",
                              class: { active: filter.filterType === "values" },
                              on: {
                                click: function ($event) {
                                  return _vm.toggleFilterType(filter)
                                },
                              },
                            },
                            [_vm._v("\n                Values\n              ")]
                          ),
                        ]),
                        _vm._v(" "),
                        filter.filterType === "values"
                          ? _c(
                              "div",
                              { staticClass: "filter-controls values-filter" },
                              [
                                _c("div", { staticClass: "values-list" }, [
                                  _c(
                                    "div",
                                    { staticClass: "values-list-header" },
                                    [
                                      _c(
                                        "div",
                                        { staticClass: "search-container" },
                                        [
                                          _c("input", {
                                            directives: [
                                              {
                                                name: "model",
                                                rawName: "v-model",
                                                value: filter.searchQuery,
                                                expression: "filter.searchQuery",
                                              },
                                            ],
                                            staticClass: "values-search",
                                            attrs: {
                                              type: "text",
                                              placeholder: "Search values...",
                                            },
                                            domProps: {
                                              value: filter.searchQuery,
                                            },
                                            on: {
                                              input: function ($event) {
                                                if ($event.target.composing) {
                                                  return
                                                }
                                                _vm.$set(
                                                  filter,
                                                  "searchQuery",
                                                  $event.target.value
                                                );
                                              },
                                            },
                                          }),
                                        ]
                                      ),
                                      _vm._v(" "),
                                      _c(
                                        "div",
                                        { staticClass: "values-actions" },
                                        [
                                          _c(
                                            "button",
                                            {
                                              staticClass: "action-btn",
                                              on: {
                                                click: function ($event) {
                                                  return _vm.selectAllValues(
                                                    filter
                                                  )
                                                },
                                              },
                                            },
                                            [_vm._v("Select All")]
                                          ),
                                          _vm._v(" "),
                                          _c(
                                            "button",
                                            {
                                              staticClass: "action-btn",
                                              on: {
                                                click: function ($event) {
                                                  return _vm.clearValues(filter)
                                                },
                                              },
                                            },
                                            [_vm._v("Clear")]
                                          ),
                                        ]
                                      ),
                                    ]
                                  ),
                                  _vm._v(" "),
                                  _c(
                                    "div",
                                    { staticClass: "values-options" },
                                    _vm._l(
                                      _vm.filteredValues(filter),
                                      function (value) {
                                        return _c(
                                          "label",
                                          {
                                            key: String(value),
                                            staticClass: "value-option",
                                          },
                                          [
                                            _c(
                                              "div",
                                              { staticClass: "checkbox-wrapper" },
                                              [
                                                _c("input", {
                                                  directives: [
                                                    {
                                                      name: "model",
                                                      rawName: "v-model",
                                                      value:
                                                        filter.selectedValues,
                                                      expression:
                                                        "filter.selectedValues",
                                                    },
                                                  ],
                                                  attrs: { type: "checkbox" },
                                                  domProps: {
                                                    value: value,
                                                    checked: Array.isArray(
                                                      filter.selectedValues
                                                    )
                                                      ? _vm._i(
                                                          filter.selectedValues,
                                                          value
                                                        ) > -1
                                                      : filter.selectedValues,
                                                  },
                                                  on: {
                                                    change: [
                                                      function ($event) {
                                                        var $$a =
                                                            filter.selectedValues,
                                                          $$el = $event.target,
                                                          $$c = $$el.checked
                                                            ? true
                                                            : false;
                                                        if (Array.isArray($$a)) {
                                                          var $$v = value,
                                                            $$i = _vm._i($$a, $$v);
                                                          if ($$el.checked) {
                                                            $$i < 0 &&
                                                              _vm.$set(
                                                                filter,
                                                                "selectedValues",
                                                                $$a.concat([$$v])
                                                              );
                                                          } else {
                                                            $$i > -1 &&
                                                              _vm.$set(
                                                                filter,
                                                                "selectedValues",
                                                                $$a
                                                                  .slice(0, $$i)
                                                                  .concat(
                                                                    $$a.slice(
                                                                      $$i + 1
                                                                    )
                                                                  )
                                                              );
                                                          }
                                                        } else {
                                                          _vm.$set(
                                                            filter,
                                                            "selectedValues",
                                                            $$c
                                                          );
                                                        }
                                                      },
                                                      _vm.filterChanged,
                                                    ],
                                                  },
                                                }),
                                              ]
                                            ),
                                            _vm._v(" "),
                                            _c(
                                              "span",
                                              { staticClass: "value-label" },
                                              [
                                                _vm._v(
                                                  _vm._s(_vm.formatValue(value))
                                                ),
                                              ]
                                            ),
                                          ]
                                        )
                                      }
                                    ),
                                    0
                                  ),
                                ]),
                              ]
                            )
                          : _c(
                              "div",
                              { staticClass: "filter-controls condition-filter" },
                              [
                                _c(
                                  "select",
                                  {
                                    directives: [
                                      {
                                        name: "model",
                                        rawName: "v-model",
                                        value: filter.condition,
                                        expression: "filter.condition",
                                      },
                                    ],
                                    on: {
                                      change: [
                                        function ($event) {
                                          var $$selectedVal =
                                            Array.prototype.filter
                                              .call(
                                                $event.target.options,
                                                function (o) {
                                                  return o.selected
                                                }
                                              )
                                              .map(function (o) {
                                                var val =
                                                  "_value" in o
                                                    ? o._value
                                                    : o.value;
                                                return val
                                              });
                                          _vm.$set(
                                            filter,
                                            "condition",
                                            $event.target.multiple
                                              ? $$selectedVal
                                              : $$selectedVal[0]
                                          );
                                        },
                                        _vm.filterChanged,
                                      ],
                                    },
                                  },
                                  [
                                    _c("option", { attrs: { value: "equals" } }, [
                                      _vm._v("Equals"),
                                    ]),
                                    _vm._v(" "),
                                    _c(
                                      "option",
                                      { attrs: { value: "notEquals" } },
                                      [_vm._v("Does not equal")]
                                    ),
                                    _vm._v(" "),
                                    _c(
                                      "option",
                                      { attrs: { value: "greaterThan" } },
                                      [_vm._v("Greater than")]
                                    ),
                                    _vm._v(" "),
                                    _c(
                                      "option",
                                      { attrs: { value: "greaterThanOrEqual" } },
                                      [_vm._v("Greater than or equal")]
                                    ),
                                    _vm._v(" "),
                                    _c(
                                      "option",
                                      { attrs: { value: "lessThan" } },
                                      [_vm._v("Less than")]
                                    ),
                                    _vm._v(" "),
                                    _c(
                                      "option",
                                      { attrs: { value: "lessThanOrEqual" } },
                                      [_vm._v("Less than or equal")]
                                    ),
                                    _vm._v(" "),
                                    _c(
                                      "option",
                                      { attrs: { value: "contains" } },
                                      [_vm._v("Contains")]
                                    ),
                                    _vm._v(" "),
                                    _c(
                                      "option",
                                      { attrs: { value: "notContains" } },
                                      [_vm._v("Does not contain")]
                                    ),
                                    _vm._v(" "),
                                    _c(
                                      "option",
                                      { attrs: { value: "startsWith" } },
                                      [_vm._v("Starts with")]
                                    ),
                                    _vm._v(" "),
                                    _c(
                                      "option",
                                      { attrs: { value: "endsWith" } },
                                      [_vm._v("Ends with")]
                                    ),
                                    _vm._v(" "),
                                    _c(
                                      "option",
                                      { attrs: { value: "isEmpty" } },
                                      [_vm._v("Is empty")]
                                    ),
                                    _vm._v(" "),
                                    _c(
                                      "option",
                                      { attrs: { value: "isNotEmpty" } },
                                      [_vm._v("Is not empty")]
                                    ),
                                  ]
                                ),
                                _vm._v(" "),
                                !["isEmpty", "isNotEmpty"].includes(
                                  filter.condition
                                )
                                  ? [
                                      _vm.getInputType(filter.field) ===
                                      "checkbox"
                                        ? _c("input", {
                                            directives: [
                                              {
                                                name: "model",
                                                rawName: "v-model",
                                                value: filter.value,
                                                expression: "filter.value",
                                              },
                                            ],
                                            attrs: { type: "checkbox" },
                                            domProps: {
                                              checked: Array.isArray(filter.value)
                                                ? _vm._i(filter.value, null) > -1
                                                : filter.value,
                                            },
                                            on: {
                                              change: [
                                                function ($event) {
                                                  var $$a = filter.value,
                                                    $$el = $event.target,
                                                    $$c = $$el.checked
                                                      ? true
                                                      : false;
                                                  if (Array.isArray($$a)) {
                                                    var $$v = null,
                                                      $$i = _vm._i($$a, $$v);
                                                    if ($$el.checked) {
                                                      $$i < 0 &&
                                                        _vm.$set(
                                                          filter,
                                                          "value",
                                                          $$a.concat([$$v])
                                                        );
                                                    } else {
                                                      $$i > -1 &&
                                                        _vm.$set(
                                                          filter,
                                                          "value",
                                                          $$a
                                                            .slice(0, $$i)
                                                            .concat(
                                                              $$a.slice($$i + 1)
                                                            )
                                                        );
                                                    }
                                                  } else {
                                                    _vm.$set(filter, "value", $$c);
                                                  }
                                                },
                                                _vm.filterChanged,
                                              ],
                                            },
                                          })
                                        : _vm.getInputType(filter.field) ===
                                          "radio"
                                        ? _c("input", {
                                            directives: [
                                              {
                                                name: "model",
                                                rawName: "v-model",
                                                value: filter.value,
                                                expression: "filter.value",
                                              },
                                            ],
                                            attrs: { type: "radio" },
                                            domProps: {
                                              checked: _vm._q(filter.value, null),
                                            },
                                            on: {
                                              change: [
                                                function ($event) {
                                                  return _vm.$set(
                                                    filter,
                                                    "value",
                                                    null
                                                  )
                                                },
                                                _vm.filterChanged,
                                              ],
                                            },
                                          })
                                        : _vm.getInputType(filter.field) ===
                                          "checkbox"
                                        ? _c("input", {
                                            directives: [
                                              {
                                                name: "model",
                                                rawName: "v-model",
                                                value: filter.value,
                                                expression: "filter.value",
                                              },
                                            ],
                                            attrs: {
                                              placeholder: "Value",
                                              type: "checkbox",
                                            },
                                            domProps: {
                                              checked: Array.isArray(filter.value)
                                                ? _vm._i(filter.value, null) > -1
                                                : filter.value,
                                            },
                                            on: {
                                              change: [
                                                function ($event) {
                                                  var $$a = filter.value,
                                                    $$el = $event.target,
                                                    $$c = $$el.checked
                                                      ? true
                                                      : false;
                                                  if (Array.isArray($$a)) {
                                                    var $$v = null,
                                                      $$i = _vm._i($$a, $$v);
                                                    if ($$el.checked) {
                                                      $$i < 0 &&
                                                        _vm.$set(
                                                          filter,
                                                          "value",
                                                          $$a.concat([$$v])
                                                        );
                                                    } else {
                                                      $$i > -1 &&
                                                        _vm.$set(
                                                          filter,
                                                          "value",
                                                          $$a
                                                            .slice(0, $$i)
                                                            .concat(
                                                              $$a.slice($$i + 1)
                                                            )
                                                        );
                                                    }
                                                  } else {
                                                    _vm.$set(filter, "value", $$c);
                                                  }
                                                },
                                                _vm.filterChanged,
                                              ],
                                            },
                                          })
                                        : _vm.getInputType(filter.field) ===
                                          "radio"
                                        ? _c("input", {
                                            directives: [
                                              {
                                                name: "model",
                                                rawName: "v-model",
                                                value: filter.value,
                                                expression: "filter.value",
                                              },
                                            ],
                                            attrs: {
                                              placeholder: "Value",
                                              type: "radio",
                                            },
                                            domProps: {
                                              checked: _vm._q(filter.value, null),
                                            },
                                            on: {
                                              change: [
                                                function ($event) {
                                                  return _vm.$set(
                                                    filter,
                                                    "value",
                                                    null
                                                  )
                                                },
                                                _vm.filterChanged,
                                              ],
                                            },
                                          })
                                        : _c("input", {
                                            directives: [
                                              {
                                                name: "model",
                                                rawName: "v-model",
                                                value: filter.value,
                                                expression: "filter.value",
                                              },
                                            ],
                                            attrs: {
                                              placeholder: "Value",
                                              type: _vm.getInputType(
                                                filter.field
                                              ),
                                            },
                                            domProps: { value: filter.value },
                                            on: {
                                              change: _vm.filterChanged,
                                              input: function ($event) {
                                                if ($event.target.composing) {
                                                  return
                                                }
                                                _vm.$set(
                                                  filter,
                                                  "value",
                                                  $event.target.value
                                                );
                                              },
                                            },
                                          }),
                                    ]
                                  : _vm._e(),
                              ],
                              2
                            ),
                      ]),
                      _vm._v(" "),
                      _c(
                        "button",
                        {
                          staticClass: "remove-btn",
                          on: {
                            click: function ($event) {
                              return _vm.removeFilter(filter)
                            },
                          },
                        },
                        [_vm._v("×")]
                      ),
                    ]
                  )
                }),
                _vm._v(" "),
                _vm.showColumnSelect
                  ? _c("div", { staticClass: "field-select-container" }, [
                      _c("input", {
                        directives: [
                          {
                            name: "model",
                            rawName: "v-model",
                            value: _vm.searchQuery,
                            expression: "searchQuery",
                          },
                        ],
                        ref: "searchInput",
                        staticClass: "field-search",
                        attrs: {
                          type: "text",
                          placeholder: "Search fields...",
                          autofocus: "",
                        },
                        domProps: { value: _vm.searchQuery },
                        on: {
                          input: [
                            function ($event) {
                              if ($event.target.composing) {
                                return
                              }
                              _vm.searchQuery = $event.target.value;
                            },
                            _vm.filterFields,
                          ],
                        },
                      }),
                      _vm._v(" "),
                      _c(
                        "select",
                        {
                          directives: [
                            {
                              name: "model",
                              rawName: "v-model",
                              value: _vm.selectedColumn,
                              expression: "selectedColumn",
                            },
                          ],
                          ref: "filterSelect",
                          staticClass: "field-select expanded",
                          attrs: { size: "6" },
                          on: {
                            change: [
                              function ($event) {
                                var $$selectedVal = Array.prototype.filter
                                  .call($event.target.options, function (o) {
                                    return o.selected
                                  })
                                  .map(function (o) {
                                    var val = "_value" in o ? o._value : o.value;
                                    return val
                                  });
                                _vm.selectedColumn = $event.target.multiple
                                  ? $$selectedVal
                                  : $$selectedVal[0];
                              },
                              _vm.addNewFilter,
                            ],
                          },
                        },
                        [
                          _c("option", { attrs: { value: "", disabled: "" } }, [
                            _vm._v("Select a field..."),
                          ]),
                          _vm._v(" "),
                          _vm._l(_vm.filteredColumns, function (field, index) {
                            return _c(
                              "option",
                              {
                                key: field + "_" + index,
                                domProps: { value: field },
                              },
                              [
                                _vm._v(
                                  "\n              " +
                                    _vm._s(field) +
                                    "\n            "
                                ),
                              ]
                            )
                          }),
                        ],
                        2
                      ),
                      _vm._v(" "),
                      _c(
                        "button",
                        {
                          staticClass: "cancel-btn",
                          on: {
                            click: function ($event) {
                              _vm.showColumnSelect = false;
                            },
                          },
                        },
                        [_vm._v("×")]
                      ),
                    ])
                  : _vm._e(),
              ],
              2
            ),
          ]
        ),
      ]),
      _vm._v(" "),
      _c("div", { staticClass: "actions-panel" }, [
        _c(
          "button",
          {
            staticClass: "export-btn",
            attrs: { title: "Export CSV" },
            on: { click: _vm.exportData },
          },
          [_vm._v("\n      Export CSV\n    ")]
        ),
      ]),
    ])
  };
  var __vue_staticRenderFns__$2 = [];
  __vue_render__$2._withStripped = true;

    /* style */
    const __vue_inject_styles__$2 = function (inject) {
      if (!inject) return
      inject("data-v-17677349_0", { source: ".fields-container[data-v-17677349] {\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n  width: 300px;\n  background-color: var(--st-dashboard-bg-0);\n  padding: 6px;\n  border-radius: 8px;\n  border: 1px solid var(--st-color-neutral);\n  height: 100%;\n  box-sizing: border-box;\n  position: relative;\n}\n.zones-container[data-v-17677349] {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  flex: 1;\n  overflow-y: auto;\n  padding-bottom: 12px;\n}\n.zones-container[data-v-17677349]::-webkit-scrollbar {\n  width: 8px;\n  height: 8px;\n}\n.zones-container[data-v-17677349]::-webkit-scrollbar-track {\n  background: transparent;\n}\n.zones-container[data-v-17677349]::-webkit-scrollbar-thumb {\n  background: var(--st-color-neutral);\n  border-radius: 4px;\n}\n.zones-container[data-v-17677349]::-webkit-scrollbar-thumb:hover {\n  background: color-mix(in srgb, var(--st-color-neutral) 80%, transparent);\n}\n.zones-container[data-v-17677349]::-webkit-scrollbar-corner {\n  background: transparent;\n}\n.field-item[data-v-17677349] {\n  position: relative;\n  z-index: 1;\n  padding: 12px 12px 12px 12px;\n  background: #f8f9fa;\n  border: 1px solid #e9ecef;\n  border-radius: 4px;\n  margin-bottom: 8px;\n  cursor: move;\n  display: flex;\n  justify-content: space-between;\n  align-items: flex-start;\n  font-size: 13px;\n}\n.field-item[data-v-17677349]:last-child {\n  margin-bottom: 0;\n}\n.field-item.dropped[data-v-17677349] {\n  background: color-mix(in srgb, var(--st-text-2) 5%, transparent);\n  border-color: var(--st-color-neutral);\n  color: var(--st-text-1);\n}\n.field-item.dropped.has-no-results[data-v-17677349] {\n  background: color-mix(in srgb, #ff0000 15%, transparent);\n  border-color: color-mix(in srgb, #ff0000 35%, transparent);\n}\n.field-item.dropped.has-no-results .filter-controls select[data-v-17677349], .field-item.dropped.has-no-results .filter-controls input[data-v-17677349] {\n  border-color: color-mix(in srgb, #ff0000 35%, transparent);\n}\n.field-item.dropped.has-no-results .filter-controls select[data-v-17677349]:focus, .field-item.dropped.has-no-results .filter-controls input[data-v-17677349]:focus {\n  border-color: #ef5350;\n}\n.field-item.drag-over-top[data-v-17677349] {\n  border-top: 2px solid #0066cc;\n}\n.field-item.drag-over-bottom[data-v-17677349] {\n  border-bottom: 2px solid #0066cc;\n}\n.remove-btn[data-v-17677349] {\n  position: absolute;\n  top: 2px;\n  right: 2px;\n  background: none;\n  border: none;\n  color: #adb5bd;\n  cursor: pointer;\n  padding: 4px;\n  font-size: 16px;\n  line-height: 1;\n  z-index: 2;\n  border-radius: 4px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 20px;\n  height: 20px;\n}\n.remove-btn[data-v-17677349]:hover {\n  color: #495057;\n  background-color: rgba(0, 0, 0, 0.05);\n}\n.field-content[data-v-17677349] {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  width: 100%;\n}\n.field-content .label-input[data-v-17677349] {\n  width: 100%;\n  padding: 4px;\n  border: 1px solid var(--st-color-neutral);\n  background: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n  color: var(--st-text-1);\n  border-radius: 3px;\n  font-size: 12px;\n}\n.field-content .label-input[data-v-17677349]:focus {\n  outline: none;\n  border-color: #0066cc;\n}\n.field-content .label-input[data-v-17677349]::placeholder {\n  color: var(--st-text-2);\n}\n.section[data-v-17677349] {\n  border: 1px solid var(--st-color-neutral);\n  border-radius: 4px;\n  background: var(--st-dashboard-bg-1);\n}\n.section .section-header[data-v-17677349] {\n  padding: 5px 10px;\n  background: var(--st-dashboard-bg-2);\n  border-bottom: 1px solid var(--st-color-neutral);\n  cursor: pointer;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  user-select: none;\n}\n.section .section-header[data-v-17677349]:hover {\n  background: color-mix(in srgb, var(--st-dashboard-bg-2), var(--st-text-1) 10%);\n}\n.section .section-header h4[data-v-17677349] {\n  margin: 0;\n  color: var(--st-text-1);\n  font-size: 14px;\n  font-weight: 600;\n}\n.section .section-content[data-v-17677349] {\n  padding: 7px 5px;\n  transition: max-height 0.3s ease-in-out;\n  overflow: visible;\n  position: relative;\n}\n.section .section-content.collapsed[data-v-17677349] {\n  max-height: 0;\n  padding: 0;\n  overflow: hidden;\n}\n.header-controls[data-v-17677349] {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n.add-btn[data-v-17677349] {\n  background: none;\n  border: none;\n  color: var(--st-text-2);\n  cursor: pointer;\n  padding: 2px 6px;\n  font-size: 16px;\n  line-height: 1;\n  border-radius: 4px;\n}\n.add-btn[data-v-17677349]:hover {\n  color: var(--st-text-1);\n  background-color: color-mix(in srgb, var(--st-text-1) 10%, transparent);\n}\n.toggle-icon[data-v-17677349] {\n  font-size: 12px;\n  color: #6c757d;\n  transition: transform 0.3s ease;\n}\n.toggle-icon.collapsed[data-v-17677349] {\n  transform: rotate(-90deg);\n}\n.available-fields[data-v-17677349], .drop-zone[data-v-17677349] {\n  margin-bottom: 16px;\n}\n.available-fields[data-v-17677349]:last-child, .drop-zone[data-v-17677349]:last-child {\n  margin-bottom: 0;\n}\n.field-item[data-v-17677349] {\n  margin-bottom: 8px;\n}\n.field-item[data-v-17677349]:last-child {\n  margin-bottom: 0;\n}\n.filter-controls[data-v-17677349] {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  width: 100%;\n}\n.filter-controls select[data-v-17677349], .filter-controls input[data-v-17677349] {\n  width: 100%;\n  padding: 4px;\n  border: 1px solid var(--st-color-neutral);\n  background: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n  color: var(--st-text-1);\n  border-radius: 3px;\n  font-size: 12px;\n}\n.filter-controls select[data-v-17677349]:focus, .filter-controls input[data-v-17677349]:focus {\n  outline: none;\n  border-color: #0066cc;\n}\n.add-filter-section[data-v-17677349] {\n  padding: 8px;\n  border-top: 1px solid #eee;\n  margin-top: 8px;\n}\n.column-select-container[data-v-17677349] {\n  display: flex;\n  gap: 8px;\n  align-items: center;\n  width: 100%;\n}\n.column-select[data-v-17677349] {\n  flex: 1;\n  padding: 6px 8px;\n  border: 1px solid #ddd;\n  border-radius: 4px;\n  font-size: 13px;\n  background-color: white;\n}\n.column-select[data-v-17677349]:focus {\n  outline: none;\n  border-color: #0066cc;\n}\n.cancel-btn[data-v-17677349] {\n  background: none;\n  border: none;\n  color: #adb5bd;\n  cursor: pointer;\n  padding: 4px;\n  font-size: 16px;\n  line-height: 1;\n  border-radius: 4px;\n}\n.cancel-btn[data-v-17677349]:hover {\n  color: #495057;\n  background-color: #f8f9fa;\n}\n.add-filter-btn[data-v-17677349] {\n  width: 100%;\n  padding: 6px 12px;\n  background-color: #f8f9fa;\n  border: 1px dashed #adb5bd;\n  border-radius: 4px;\n  color: #495057;\n  cursor: pointer;\n  font-size: 13px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 4px;\n}\n.add-filter-btn[data-v-17677349]:hover {\n  background-color: #e9ecef;\n  border-color: #495057;\n}\n.add-filter-btn[data-v-17677349]::before {\n  content: \"+\";\n  font-size: 16px;\n  line-height: 1;\n  margin-right: 4px;\n}\n.add-field-section[data-v-17677349] {\n  display: none;\n}\n.field-select-container[data-v-17677349] {\n  position: absolute;\n  top: 47px;\n  right: 4px;\n  width: calc(100% - 25px);\n  background: var(--st-dashboard-bg-1);\n  border: solid 1px var(--st-color-neutral);\n  border-radius: 4px;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);\n  padding: 8px;\n  z-index: 1000;\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n.field-search[data-v-17677349] {\n  width: 100%;\n  padding: 6px 8px;\n  border: 1px solid #ddd;\n  border-radius: 4px;\n  font-size: 13px;\n  box-sizing: border-box;\n}\n.field-search[data-v-17677349]:focus {\n  outline: none;\n  border-color: #0066cc;\n}\n.field-select[data-v-17677349] {\n  width: 100%;\n  border-radius: 4px;\n  font-size: 13px;\n  background-color: var(--st-dashboard-bg-1);\n}\n.field-select.expanded[data-v-17677349] {\n  max-height: 200px;\n  overflow-y: auto;\n}\n.field-select.expanded option[data-v-17677349] {\n  padding: 6px 8px;\n  color: var(--st-text-1);\n}\n.field-select.expanded option[data-v-17677349]:hover {\n  background-color: color-mix(in srgb, var(--st-text-1) 10%, transparent);\n}\n.field-select.expanded option[value=\"\"][data-v-17677349] {\n  color: #6c757d;\n  font-style: italic;\n}\n.field-select[data-v-17677349]:focus {\n  outline: none;\n  border-color: #0066cc;\n}\n.cancel-btn[data-v-17677349] {\n  position: absolute;\n  top: 11px;\n  right: 11px;\n  width: 20px;\n  background: none;\n  border: none;\n  color: #adb5bd;\n  cursor: pointer;\n  padding: 4px;\n  font-size: 16px;\n  line-height: 1;\n  border-radius: 4px;\n}\n.cancel-btn[data-v-17677349]:hover {\n  color: #495057;\n  background-color: #f8f9fa;\n}\n.field-content[data-v-17677349] {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  width: 100%;\n}\n.field-controls[data-v-17677349] {\n  display: flex;\n  gap: 4px;\n  align-items: center;\n}\nselect[data-v-17677349] {\n  font-size: 12px;\n  padding: 2px 4px;\n  border: 1px solid var(--st-color-neutral);\n  border-radius: 3px;\n  background: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n  color: var(--st-text-1);\n}\nselect.sort-select[data-v-17677349] {\n  width: 110px;\n}\nselect.order-select[data-v-17677349] {\n  width: 90px;\n}\n.field-header[data-v-17677349] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  margin-bottom: 12px;\n}\n.field-header .field-name[data-v-17677349] {\n  /* font-size: 16px;\n  font-weight: 500; */\n}\n.filter-type-selector[data-v-17677349] {\n  display: flex;\n  padding: 2px;\n  border-radius: 6px;\n  border: 1px solid var(--st-color-neutral);\n  margin-bottom: 12px;\n}\n.filter-type-btn[data-v-17677349] {\n  flex: 1;\n  padding: 2px 5px;\n  font-size: 14px;\n  border: none;\n  background: transparent;\n  cursor: pointer;\n  border-radius: 4px;\n  color: var(--st-text-2);\n  transition: all 0.2s ease;\n}\n.filter-type-btn.active[data-v-17677349] {\n  background: color-mix(in srgb, var(--st-text-1) 15%, transparent);\n  color: var(--st-text-1);\n  font-weight: 500;\n}\n.filter-type-btn[data-v-17677349]:hover:not(.active) {\n  background: color-mix(in srgb, var(--st-text-1) 8%, transparent);\n}\n.values-filter[data-v-17677349] {\n  /* background: #fff; */\n  border: 1px solid var(--st-color-neutral);\n  border-radius: 6px;\n  overflow: hidden;\n}\n.values-list[data-v-17677349] {\n  max-height: 300px;\n  overflow-y: auto;\n}\n.values-list-header[data-v-17677349] {\n  position: sticky;\n  top: 0;\n  background: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n  border-bottom: 1px solid var(--st-color-neutral);\n  padding: 12px;\n  z-index: 1;\n}\n.search-container[data-v-17677349] {\n  margin-bottom: 12px;\n}\n.values-search[data-v-17677349] {\n  width: 100%;\n  padding: 8px 12px;\n  border: 1px solid #ddd;\n  border-radius: 6px;\n  font-size: 14px;\n  background: #f8f8f8;\n}\n.values-search[data-v-17677349]:focus {\n  outline: none;\n  border-color: #0066cc;\n  background: #fff;\n}\n.values-search[data-v-17677349]::placeholder {\n  color: #999;\n}\n.values-actions[data-v-17677349] {\n  display: flex;\n  gap: 8px;\n}\n.action-btn[data-v-17677349] {\n  flex: 1;\n  padding: 2px 6px;\n  font-size: 14px;\n  border: 1px solid var(--st-color-neutral);\n  border-radius: 6px;\n  background: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n  cursor: pointer;\n  color: var(--st-text-1);\n  transition: all 0.2s ease;\n}\n.action-btn[data-v-17677349]:hover {\n  background: color-mix(in srgb, var(--st-text-1) 15%, transparent);\n}\n.values-options[data-v-17677349] {\n  padding: 8px 12px;\n}\n.value-option[data-v-17677349] {\n  display: flex;\n  align-items: center;\n  padding: 2px 2px;\n  cursor: pointer;\n  border-radius: 4px;\n  transition: background-color 0.2s ease;\n}\n.value-option[data-v-17677349]:hover {\n  background: color-mix(in srgb, var(--st-text-1) 15%, transparent);\n}\n.checkbox-wrapper[data-v-17677349] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 20px;\n  height: 20px;\n  margin-right: 12px;\n}\n.checkbox-wrapper input[type=checkbox][data-v-17677349] {\n  width: 16px;\n  height: 16px;\n  margin: 0;\n  cursor: pointer;\n}\n.value-label[data-v-17677349] {\n  flex: 1;\n  font-size: 14px;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.values-list[data-v-17677349]::-webkit-scrollbar {\n  width: 8px;\n}\n.values-list[data-v-17677349]::-webkit-scrollbar-track {\n  background: #f1f1f1;\n  border-radius: 4px;\n}\n.values-list[data-v-17677349]::-webkit-scrollbar-thumb {\n  background: #ccc;\n  border-radius: 4px;\n}\n.values-list[data-v-17677349]::-webkit-scrollbar-thumb:hover {\n  background: #bbb;\n}\n.condition-filter select[data-v-17677349], .condition-filter input[data-v-17677349] {\n  width: 100%;\n  /* padding: 8px 12px; */\n  /* border: 1px solid #ddd; */\n  border-radius: 6px;\n  font-size: 14px;\n  margin-bottom: 8px;\n  /* background: #fff; */\n  box-sizing: border-box;\n}\n.condition-filter select[data-v-17677349]:focus, .condition-filter input[data-v-17677349]:focus {\n  outline: none;\n  border-color: #0066cc;\n}\n.condition-filter input[data-v-17677349] {\n  padding: 6px 10px;\n}\n.remove-btn[data-v-17677349] {\n  position: absolute;\n  top: 2px;\n  right: 2px;\n  background: none;\n  border: none;\n  color: #999;\n  font-size: 18px;\n  cursor: pointer;\n  padding: 4px 8px;\n  border-radius: 4px;\n}\n.remove-btn[data-v-17677349]:hover {\n  color: #666;\n  background: #f0f0f0;\n}\n.formula-input-container[data-v-17677349] {\n  margin-top: 8px;\n  width: 100%;\n}\n.formula-input[data-v-17677349] {\n  width: 100%;\n  padding: 8px;\n  border: 1px solid #ddd;\n  border-radius: 4px;\n  font-size: 13px;\n}\n.formula-input[data-v-17677349]:focus {\n  outline: none;\n  border-color: #0066cc;\n}\n.formula-input.error[data-v-17677349] {\n  border-color: #dc3545;\n  background-color: #fff3f3;\n}\n.formula-error[data-v-17677349] {\n  color: #dc3545;\n  font-size: 12px;\n  margin-top: 4px;\n  padding: 4px;\n  background-color: #fff3f3;\n  border-radius: 4px;\n}\n.actions-panel[data-v-17677349] {\n  position: sticky;\n  bottom: 0;\n  left: 0;\n  right: 0;\n  padding: 12px;\n  background: var(--st-dashboard-bg-0);\n  border-top: 1px solid var(--st-color-neutral);\n  display: flex;\n  justify-content: center;\n  margin: 0 -6px -6px -6px;\n  border-radius: 0 0 8px 8px;\n  flex-shrink: 0;\n  z-index: 10;\n}\n.actions-panel .export-btn[data-v-17677349] {\n  width: 100%;\n  padding: 8px;\n  background: var(--st-dashboard-bg-2);\n  border: 1px solid var(--st-color-neutral);\n  border-radius: 4px;\n  color: var(--st-text-1);\n  cursor: pointer;\n  font-size: 13px;\n  font-weight: 500;\n}\n.actions-panel .export-btn[data-v-17677349]:hover {\n  background: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n}\n\n/*# sourceMappingURL=st-pivottable-controls.vue.map */", map: {"version":3,"sources":["/Users/daniel/Documents/work/stipple_app/pivot-table/lib/src/components/st-pivottable-controls.vue","st-pivottable-controls.vue"],"names":[],"mappings":"AA6rCA;EACA,aAAA;EACA,sBAAA;EACA,SAAA;EACA,YAAA;EACA,0CAAA;EACA,YAAA;EACA,kBAAA;EACA,yCAAA;EACA,YAAA;EACA,sBAAA;EACA,kBAAA;AC5rCA;AD+rCA;EACA,aAAA;EACA,sBAAA;EACA,QAAA;EACA,OAAA;EACA,gBAAA;EACA,oBAAA;AC5rCA;AD+rCA;EACA,UAAA;EACA,WAAA;AC7rCA;ADgsCA;EACA,uBAAA;AC9rCA;ADisCA;EACA,mCAAA;EACA,kBAAA;AC/rCA;ADisCA;EACA,wEAAA;AC/rCA;ADmsCA;EACA,uBAAA;ACjsCA;ADqsCA;EACA,kBAAA;EACA,UAAA;EACA,4BAAA;EACA,mBAAA;EACA,yBAAA;EACA,kBAAA;EACA,kBAAA;EACA,YAAA;EACA,aAAA;EACA,8BAAA;EACA,uBAAA;EACA,eAAA;AClsCA;ADosCA;EACA,gBAAA;AClsCA;ADqsCA;EACA,gEAAA;EACA,qCAAA;EACA,uBAAA;ACnsCA;ADqsCA;EACA,wDAAA;EACA,0DAAA;ACnsCA;ADssCA;EACA,0DAAA;ACpsCA;ADssCA;EACA,qBAAA;ACpsCA;AD2sCA;EACA,6BAAA;ACzsCA;AD4sCA;EACA,gCAAA;AC1sCA;AD8sCA;EACA,kBAAA;EACA,QAAA;EACA,UAAA;EACA,gBAAA;EACA,YAAA;EACA,cAAA;EACA,eAAA;EACA,YAAA;EACA,eAAA;EACA,cAAA;EACA,UAAA;EACA,kBAAA;EACA,aAAA;EACA,mBAAA;EACA,uBAAA;EACA,WAAA;EACA,YAAA;AC3sCA;AD6sCA;EACA,cAAA;EACA,qCAAA;AC3sCA;AD+sCA;EACA,aAAA;EACA,sBAAA;EACA,QAAA;EACA,WAAA;AC5sCA;AD8sCA;EACA,WAAA;EACA,YAAA;EACA,yCAAA;EACA,gEAAA;EACA,uBAAA;EACA,kBAAA;EACA,eAAA;AC5sCA;AD8sCA;EACA,aAAA;EACA,qBAAA;AC5sCA;AD+sCA;EACA,uBAAA;AC7sCA;ADktCA;EACA,yCAAA;EACA,kBAAA;EACA,oCAAA;AC/sCA;ADitCA;EACA,iBAAA;EACA,oCAAA;EACA,gDAAA;EACA,eAAA;EACA,aAAA;EACA,8BAAA;EACA,mBAAA;EACA,iBAAA;AC/sCA;ADitCA;EACA,8EAAA;AC/sCA;ADktCA;EACA,SAAA;EACA,uBAAA;EACA,eAAA;EACA,gBAAA;AChtCA;ADotCA;EACA,gBAAA;EACA,uCAAA;EACA,iBAAA;EACA,kBAAA;ACltCA;ADotCA;EACA,aAAA;EACA,UAAA;EACA,gBAAA;ACltCA;ADutCA;EACA,aAAA;EACA,mBAAA;EACA,QAAA;ACptCA;ADutCA;EACA,gBAAA;EACA,YAAA;EACA,uBAAA;EACA,eAAA;EACA,gBAAA;EACA,eAAA;EACA,cAAA;EACA,kBAAA;ACptCA;ADstCA;EACA,uBAAA;EACA,uEAAA;ACptCA;ADwtCA;EACA,eAAA;EACA,cAAA;EACA,+BAAA;ACrtCA;ADutCA;EACA,yBAAA;ACrtCA;AD0tCA;EACA,mBAAA;ACvtCA;ADytCA;EACA,gBAAA;ACvtCA;AD2tCA;EACA,kBAAA;ACxtCA;AD0tCA;EACA,gBAAA;ACxtCA;AD4tCA;EACA,aAAA;EACA,sBAAA;EACA,QAAA;EACA,WAAA;ACztCA;AD2tCA;EACA,WAAA;EACA,YAAA;EAEA,yCAAA;EACA,gEAAA;EACA,uBAAA;EAEA,kBAAA;EACA,eAAA;AC3tCA;AD6tCA;EACA,aAAA;EACA,qBAAA;AC3tCA;ADguCA;EACA,YAAA;EACA,0BAAA;EACA,eAAA;AC7tCA;ADguCA;EACA,aAAA;EACA,QAAA;EACA,mBAAA;EACA,WAAA;AC7tCA;ADguCA;EACA,OAAA;EACA,gBAAA;EACA,sBAAA;EACA,kBAAA;EACA,eAAA;EACA,uBAAA;AC7tCA;AD+tCA;EACA,aAAA;EACA,qBAAA;AC7tCA;ADiuCA;EACA,gBAAA;EACA,YAAA;EACA,cAAA;EACA,eAAA;EACA,YAAA;EACA,eAAA;EACA,cAAA;EACA,kBAAA;AC9tCA;ADguCA;EACA,cAAA;EACA,yBAAA;AC9tCA;ADkuCA;EACA,WAAA;EACA,iBAAA;EACA,yBAAA;EACA,0BAAA;EACA,kBAAA;EACA,cAAA;EACA,eAAA;EACA,eAAA;EACA,aAAA;EACA,mBAAA;EACA,uBAAA;EACA,QAAA;AC/tCA;ADiuCA;EACA,yBAAA;EACA,qBAAA;AC/tCA;ADkuCA;EACA,YAAA;EACA,eAAA;EACA,cAAA;EACA,iBAAA;AChuCA;ADouCA;EACA,aAAA;ACjuCA;ADouCA;EACA,kBAAA;EACA,SAAA;EACA,UAAA;EACA,wBAAA;EACA,oCAAA;EACA,yCAAA;EACA,kBAAA;EACA,yCAAA;EACA,YAAA;EACA,aAAA;EACA,aAAA;EACA,sBAAA;EACA,QAAA;ACjuCA;ADouCA;EACA,WAAA;EACA,gBAAA;EACA,sBAAA;EACA,kBAAA;EACA,eAAA;EACA,sBAAA;ACjuCA;ADmuCA;EACA,aAAA;EACA,qBAAA;ACjuCA;ADquCA;EACA,WAAA;EACA,kBAAA;EACA,eAAA;EACA,0CAAA;ACluCA;ADouCA;EACA,iBAAA;EACA,gBAAA;ACluCA;ADouCA;EACA,gBAAA;EACA,uBAAA;ACluCA;ADouCA;EACA,uEAAA;ACluCA;ADquCA;EACA,cAAA;EACA,kBAAA;ACnuCA;ADwuCA;EACA,aAAA;EACA,qBAAA;ACtuCA;AD0uCA;EACA,kBAAA;EACA,SAAA;EACA,WAAA;EACA,WAAA;EACA,gBAAA;EACA,YAAA;EACA,cAAA;EACA,eAAA;EACA,YAAA;EACA,eAAA;EACA,cAAA;EACA,kBAAA;ACvuCA;ADyuCA;EACA,cAAA;EACA,yBAAA;ACvuCA;AD2uCA;EACA,aAAA;EACA,sBAAA;EACA,QAAA;EACA,WAAA;ACxuCA;AD2uCA;EACA,aAAA;EACA,QAAA;EACA,mBAAA;ACxuCA;AD6uCA;EACA,eAAA;EACA,gBAAA;EACA,yCAAA;EACA,kBAAA;EACA,gEAAA;EACA,uBAAA;AC1uCA;AD4uCA;EACA,YAAA;AC1uCA;AD6uCA;EACA,WAAA;AC3uCA;AD+uCA;EACA,aAAA;EACA,mBAAA;EACA,8BAAA;EACA,mBAAA;AC5uCA;AD8uCA;EACA;qBAAA;AC3uCA;ADgvCA;EACA,aAAA;EACA,YAAA;EACA,kBAAA;EACA,yCAAA;EACA,mBAAA;AC7uCA;ADgvCA;EACA,OAAA;EACA,gBAAA;EACA,eAAA;EACA,YAAA;EACA,uBAAA;EACA,eAAA;EACA,kBAAA;EACA,uBAAA;EACA,yBAAA;AC7uCA;AD+uCA;EACA,iEAAA;EACA,uBAAA;EACA,gBAAA;AC7uCA;ADgvCA;EACA,gEAAA;AC9uCA;ADkvCA;EACA,sBAAA;EACA,yCAAA;EACA,kBAAA;EACA,gBAAA;AC/uCA;ADkvCA;EACA,iBAAA;EACA,gBAAA;AC/uCA;ADkvCA;EACA,gBAAA;EACA,MAAA;EACA,gEAAA;EACA,gDAAA;EACA,aAAA;EACA,UAAA;AC/uCA;ADkvCA;EACA,mBAAA;AC/uCA;ADkvCA;EACA,WAAA;EACA,iBAAA;EACA,sBAAA;EACA,kBAAA;EACA,eAAA;EACA,mBAAA;AC/uCA;ADivCA;EACA,aAAA;EACA,qBAAA;EACA,gBAAA;AC/uCA;ADkvCA;EACA,WAAA;AChvCA;ADovCA;EACA,aAAA;EACA,QAAA;ACjvCA;ADovCA;EACA,OAAA;EACA,gBAAA;EACA,eAAA;EACA,yCAAA;EACA,kBAAA;EACA,gEAAA;EACA,eAAA;EACA,uBAAA;EACA,yBAAA;ACjvCA;ADmvCA;EACA,iEAAA;ACjvCA;ADqvCA;EACA,iBAAA;AClvCA;ADqvCA;EACA,aAAA;EACA,mBAAA;EACA,gBAAA;EACA,eAAA;EACA,kBAAA;EACA,sCAAA;AClvCA;ADovCA;EACA,iEAAA;AClvCA;ADsvCA;EACA,aAAA;EACA,mBAAA;EACA,uBAAA;EACA,WAAA;EACA,YAAA;EACA,kBAAA;ACnvCA;ADqvCA;EACA,WAAA;EACA,YAAA;EACA,SAAA;EACA,eAAA;ACnvCA;ADuvCA;EACA,OAAA;EACA,eAAA;EACA,gBAAA;EACA,uBAAA;EACA,mBAAA;ACpvCA;ADyvCA;EACA,UAAA;ACtvCA;ADyvCA;EACA,mBAAA;EACA,kBAAA;ACvvCA;AD0vCA;EACA,gBAAA;EACA,kBAAA;ACxvCA;AD0vCA;EACA,gBAAA;ACxvCA;AD+vCA;EACA,WAAA;EACA,uBAAA;EACA,4BAAA;EACA,kBAAA;EACA,eAAA;EACA,kBAAA;EACA,sBAAA;EACA,sBAAA;AC5vCA;AD8vCA;EACA,aAAA;EACA,qBAAA;AC5vCA;ADgwCA;EACA,iBAAA;AC9vCA;ADkwCA;EACA,kBAAA;EACA,QAAA;EACA,UAAA;EACA,gBAAA;EACA,YAAA;EACA,WAAA;EACA,eAAA;EACA,eAAA;EACA,gBAAA;EACA,kBAAA;AC/vCA;ADiwCA;EACA,WAAA;EACA,mBAAA;AC/vCA;ADmwCA;EACA,eAAA;EACA,WAAA;AChwCA;ADmwCA;EACA,WAAA;EACA,YAAA;EACA,sBAAA;EACA,kBAAA;EACA,eAAA;AChwCA;ADkwCA;EACA,aAAA;EACA,qBAAA;AChwCA;ADmwCA;EACA,qBAAA;EACA,yBAAA;ACjwCA;ADqwCA;EACA,cAAA;EACA,eAAA;EACA,eAAA;EACA,YAAA;EACA,yBAAA;EACA,kBAAA;AClwCA;ADqwCA;EACA,gBAAA;EACA,SAAA;EACA,OAAA;EACA,QAAA;EACA,aAAA;EACA,oCAAA;EACA,6CAAA;EACA,aAAA;EACA,uBAAA;EACA,wBAAA;EACA,0BAAA;EACA,cAAA;EACA,WAAA;AClwCA;ADowCA;EACA,WAAA;EACA,YAAA;EACA,oCAAA;EACA,yCAAA;EACA,kBAAA;EACA,uBAAA;EACA,eAAA;EACA,eAAA;EACA,gBAAA;AClwCA;ADowCA;EACA,gEAAA;AClwCA;;AAEA,qDAAqD","file":"st-pivottable-controls.vue","sourcesContent":["<template>\n  <div class=\"fields-container\">\n    <div class=\"zones-container\">\n      <!-- Rows Zone -->\n      <div \n        class=\"drop-zone section\"\n        data-zone=\"rows\"\n        :class=\"{ 'drag-over': dragOverZone === 'rows' }\"\n        @dragover.prevent=\"onDragOver($event, 'rows')\"\n        @dragleave=\"dragOverZone = null\"\n        @drop=\"onDrop($event, 'rows')\"\n      >\n        <div class=\"section-header\" @click=\"toggleSection('rows')\">\n          <h4>Rows</h4>\n          <div class=\"header-controls\">\n            <button \n              class=\"add-btn\"\n              @click.stop=\"showFieldSelect('rows')\"\n              title=\"Add Row\"\n            >\n              +\n            </button>\n            <span class=\"toggle-icon\" :class=\"{ 'collapsed': collapsedSections.rows }\">▼</span>\n          </div>\n        </div>\n        <div class=\"section-content\" :class=\"{ 'collapsed': collapsedSections.rows }\">\n          <div \n            v-for=\"field in config.rows\" \n            :key=\"field.field\"\n            class=\"field-item dropped\"\n            draggable=\"true\"\n            @dragstart=\"onDragStart($event, field.field, 'rows')\"\n            @dragend=\"onDragEnd\"\n          >\n            <div class=\"field-content\">\n              <span>{{ field.field }}</span>\n              <div class=\"field-controls\">\n                <select v-model=\"field.sortBy\" @change=\"onSortChange(field)\" class=\"sort-select\">\n                  <option value=\"label\">Label</option>\n                  <option \n                    v-for=\"value in config.values\" \n                    :key=\"value.id || `${value.field}_${value.aggregation}`\" \n                    :value=\"`${value.field}_${value.aggregation.toLowerCase()}`\"\n                  >\n                    {{ value.field }} ({{ value.aggregation }})\n                  </option>\n                </select>\n                <select v-model=\"field.sortOrder\" @change=\"onSortChange(field)\" class=\"order-select\">\n                  <option value=\"asc\">Ascending</option>\n                  <option value=\"desc\">Descending</option>\n                </select>\n                <button class=\"remove-btn\" @click=\"removeField('rows', field)\">×</button>\n              </div>\n            </div>\n          </div>\n\n          <!-- Field Select Dropdown -->\n          <div v-if=\"activeAddField === 'rows'\" class=\"field-select-container\">\n            <input \n              type=\"text\" \n              v-model=\"searchQuery\" \n              class=\"field-search\"\n              placeholder=\"Search fields...\"\n              @input=\"filterFields\"\n              ref=\"searchInput\"\n              autofocus\n            />\n            <select \n              ref=\"rowsSelect\"\n              v-model=\"selectedField\" \n              @change=\"addNewField('rows')\" \n              class=\"field-select expanded\"\n              size=\"6\"\n            >\n              <option value=\"\" disabled>Select a field...</option>\n              <option \n                v-for=\"(field, index) in filteredFields\" \n                :key=\"`${field}_${index}`\"\n                :value=\"field\"\n              >\n                {{ field }}\n              </option>\n            </select>\n            <button class=\"cancel-btn\" @click=\"activeAddField = null\">×</button>\n          </div>\n        </div>\n      </div>\n\n      <!-- Columns Zone -->\n      <div \n        class=\"drop-zone section\"\n        data-zone=\"columns\"\n        :class=\"{ 'drag-over': dragOverZone === 'columns' }\"\n        @dragover.prevent=\"onDragOver($event, 'columns')\"\n        @dragleave=\"dragOverZone = null\"\n        @drop=\"onDrop($event, 'columns')\"\n      >\n        <div class=\"section-header\" @click=\"toggleSection('columns')\">\n          <h4>Columns</h4>\n          <div class=\"header-controls\">\n            <button \n              class=\"add-btn\"\n              @click.stop=\"showFieldSelect('columns')\"\n              title=\"Add Column\"\n            >\n              +\n            </button>\n            <span class=\"toggle-icon\" :class=\"{ 'collapsed': collapsedSections.columns }\">▼</span>\n          </div>\n        </div>\n        <div class=\"section-content\" :class=\"{ 'collapsed': collapsedSections.columns }\">\n          <div \n            v-for=\"field in config.columns\" \n            :key=\"field.field\"\n            class=\"field-item dropped\"\n            draggable=\"true\"\n            @dragstart=\"onDragStart($event, field.field, 'columns')\"\n            @dragend=\"onDragEnd\"\n          >\n            <div class=\"field-content\">\n              <span>{{ field.field }}</span>\n              <div class=\"field-controls\">\n                <select v-model=\"field.sortBy\" @change=\"onSortChange(field)\" class=\"sort-select\">\n                  <option value=\"label\">Label</option>\n                  <option \n                    v-for=\"value in config.values\" \n                    :key=\"value.id || `${value.field}_${value.aggregation}`\" \n                    :value=\"`${value.field}_${value.aggregation.toLowerCase()}`\"\n                  >\n                    {{ value.field }} ({{ value.aggregation }})\n                  </option>\n                </select>\n                <select v-model=\"field.sortOrder\" @change=\"onSortChange(field)\" class=\"order-select\">\n                  <option value=\"asc\">Ascending</option>\n                  <option value=\"desc\">Descending</option>\n                </select>\n                <button class=\"remove-btn\" @click=\"removeField('columns', field)\">×</button>\n              </div>\n            </div>\n          </div>\n\n          <!-- Field Select Dropdown -->\n          <div v-if=\"activeAddField === 'columns'\" class=\"field-select-container\">\n            <input \n              type=\"text\" \n              v-model=\"searchQuery\" \n              class=\"field-search\"\n              placeholder=\"Search fields...\"\n              @input=\"filterFields\"\n              ref=\"searchInput\"\n              autofocus\n            />\n            <select \n              ref=\"columnsSelect\"\n              v-model=\"selectedField\" \n              @change=\"addNewField('columns')\" \n              class=\"field-select expanded\"\n              size=\"6\"\n            >\n              <option value=\"\" disabled>Select a field...</option>\n              <option \n                v-for=\"(field, index) in filteredFields\" \n                :key=\"`${field}_${index}`\"\n                :value=\"field\"\n              >\n                {{ field }}\n              </option>\n            </select>\n            <button class=\"cancel-btn\" @click=\"activeAddField = null\">×</button>\n          </div>\n        </div>\n      </div>\n\n      <!-- Values Zone -->\n      <div \n        class=\"drop-zone section\"\n        data-zone=\"values\"\n        :class=\"{ 'drag-over': dragOverZone === 'values' }\"\n        @dragover.prevent=\"onDragOver($event, 'values')\"\n        @dragleave=\"dragOverZone = null\"\n        @drop=\"onDrop($event, 'values')\"\n      >\n        <div class=\"section-header\" @click=\"toggleSection('values')\">\n          <h4>Values</h4>\n          <div class=\"header-controls\">\n            <button \n              class=\"add-btn\"\n              @click.stop=\"showFieldSelect('values')\"\n              title=\"Add Value\"\n            >\n              +\n            </button>\n            <span class=\"toggle-icon\" :class=\"{ 'collapsed': collapsedSections.values }\">▼</span>\n          </div>\n        </div>\n        <div class=\"section-content\" :class=\"{ 'collapsed': collapsedSections.values }\">\n          <div \n            v-for=\"field in config.values\" \n            :key=\"field.id\"\n            class=\"field-item dropped\"\n            draggable=\"true\"\n            @dragstart=\"onDragStart($event, field.field, 'values')\"\n            @dragend=\"onDragEnd\"\n          >\n            <div class=\"field-content\">\n              {{ field.field }}\n              <select v-model=\"field.aggregation\" @change=\"onAggregationChange(field)\">\n                <option value=\"sum\">SUM</option>\n                <option value=\"counta\">COUNTA</option>\n                <option value=\"count\">COUNT</option>\n                <option value=\"countunique\">COUNTUNIQUE</option>\n                <option value=\"average\">AVERAGE</option>\n                <option value=\"max\">MAX</option>\n                <option value=\"min\">MIN</option>\n                <option value=\"median\">MEDIAN</option>\n                <option value=\"stdev\">STDEV</option>\n                <option value=\"stdevp\">STDEVP</option>\n                <option value=\"var\">VAR</option>\n                <option value=\"varp\">VARP</option>\n                <option value=\"custom\">Custom Formula</option>\n              </select>\n              <input \n                type=\"text\" \n                v-model=\"field.label\" \n                class=\"label-input\"\n                placeholder=\"Custom label (optional)\"\n                @input=\"onLabelChange(field)\"\n              />\n              <div v-if=\"field.aggregation === 'custom'\" class=\"formula-input-container\">\n                <input \n                  type=\"text\" \n                  v-model=\"field.formula\" \n                  class=\"formula-input\"\n                  placeholder=\"Enter formula (e.g. {Revenue} - {Costs})\"\n                  @input=\"validateAndUpdateFormula(field)\"\n                  :class=\"{ 'error': field.formulaError }\"\n                />\n                <div v-if=\"field.formulaError\" class=\"formula-error\">\n                  {{ field.formulaError }}\n                </div>\n              </div>\n              <button class=\"remove-btn\" @click=\"removeField('values', field)\">×</button>\n            </div>\n          </div>\n\n          <!-- Field Select Dropdown -->\n          <div v-if=\"activeAddField === 'values'\" class=\"field-select-container\">\n            <input \n              type=\"text\" \n              v-model=\"searchQuery\" \n              class=\"field-search\"\n              placeholder=\"Search fields...\"\n              @input=\"filterFields\"\n              ref=\"searchInput\"\n              autofocus\n            />\n            <select \n              ref=\"valuesSelect\"\n              v-model=\"selectedField\" \n              @change=\"addNewField('values')\" \n              class=\"field-select expanded\"\n              size=\"6\"\n            >\n              <option value=\"\" disabled>Select a field...</option>\n              <option \n                v-for=\"(field, index) in filteredFields\" \n                :key=\"`${field}_${index}`\"\n                :value=\"field\"\n              >\n                {{ field }}\n              </option>\n            </select>\n            <button class=\"cancel-btn\" @click=\"activeAddField = null\">×</button>\n          </div>\n        </div>\n      </div>\n\n      <!-- Filters Zone -->\n      <div \n        class=\"drop-zone section\"\n        data-zone=\"filters\"\n        :class=\"{ \n          'drag-over': dragOverZone === 'filters'\n        }\"\n        @dragover.prevent=\"onDragOver($event, 'filters')\"\n        @dragleave=\"dragOverZone = null\"\n        @drop=\"onDrop($event, 'filters')\"\n      >\n        <div class=\"section-header\" @click=\"toggleSection('filters')\">\n          <h4>Filters</h4>\n          <div class=\"header-controls\">\n            <button \n              class=\"add-btn\"\n              @click.stop=\"showFilterSelect\"\n              title=\"Add Filter\"\n            >\n              +\n            </button>\n            <span class=\"toggle-icon\" :class=\"{ 'collapsed': collapsedSections.filters }\">▼</span>\n          </div>\n        </div>\n        <div class=\"section-content\" :class=\"{ 'collapsed': collapsedSections.filters }\">\n          <div \n            v-for=\"(filter, index) in filters\" \n            :key=\"`filter_${filter.field}_${index}`\"\n            class=\"field-item dropped\"\n            :class=\"{\n              'field-item': true,\n              'dropped': true,\n              'has-no-results': !filterResults[filter.field]\n            }\"\n            draggable=\"true\"\n            @dragstart=\"onDragStart($event, filter.field, 'filters')\"\n            @dragend=\"onDragEnd\">\n            <div class=\"field-content\">\n              <div class=\"field-header\">\n                <span class=\"field-name\">{{ filter.field }}</span>\n              </div>\n              <div class=\"filter-type-selector\">\n                <button class=\"filter-type-btn\" \n                        :class=\"{ active: filter.filterType === 'condition' }\"\n                        @click=\"toggleFilterType(filter)\">\n                  Condition\n                </button>\n                <button class=\"filter-type-btn\" \n                        :class=\"{ active: filter.filterType === 'values' }\"\n                        @click=\"toggleFilterType(filter)\">\n                  Values\n                </button>\n              </div>\n\n              <!-- Values-based filter controls -->\n              <div v-if=\"filter.filterType === 'values'\" class=\"filter-controls values-filter\">\n                <div class=\"values-list\">\n                  <div class=\"values-list-header\">\n                    <div class=\"search-container\">\n                      <input type=\"text\" \n                             v-model=\"filter.searchQuery\"\n                             placeholder=\"Search values...\"\n                             class=\"values-search\">\n                    </div>\n                    <div class=\"values-actions\">\n                      <button class=\"action-btn\" @click=\"selectAllValues(filter)\">Select All</button>\n                      <button class=\"action-btn\" @click=\"clearValues(filter)\">Clear</button>\n                    </div>\n                  </div>\n                  <div class=\"values-options\">\n                    <label v-for=\"value in filteredValues(filter)\" \n                           :key=\"String(value)\"\n                           class=\"value-option\">\n                      <div class=\"checkbox-wrapper\">\n                        <input type=\"checkbox\" \n                               :value=\"value\"\n                               v-model=\"filter.selectedValues\"\n                               @change=\"filterChanged\">\n                      </div>\n                      <span class=\"value-label\">{{ formatValue(value) }}</span>\n                    </label>\n                  </div>\n                </div>\n              </div>\n\n              <!-- Condition-based filter controls -->\n              <div v-else class=\"filter-controls condition-filter\">\n                <select v-model=\"filter.condition\" @change=\"filterChanged\">\n                  <option value=\"equals\">Equals</option>\n                  <option value=\"notEquals\">Does not equal</option>\n                  <option value=\"greaterThan\">Greater than</option>\n                  <option value=\"greaterThanOrEqual\">Greater than or equal</option>\n                  <option value=\"lessThan\">Less than</option>\n                  <option value=\"lessThanOrEqual\">Less than or equal</option>\n                  <option value=\"contains\">Contains</option>\n                  <option value=\"notContains\">Does not contain</option>\n                  <option value=\"startsWith\">Starts with</option>\n                  <option value=\"endsWith\">Ends with</option>\n                  <option value=\"isEmpty\">Is empty</option>\n                  <option value=\"isNotEmpty\">Is not empty</option>\n                </select>\n                \n                <template v-if=\"!['isEmpty', 'isNotEmpty'].includes(filter.condition)\">\n                  <input v-if=\"getInputType(filter.field) === 'checkbox'\"\n                         type=\"checkbox\"\n                         v-model=\"filter.value\"\n                         @change=\"filterChanged\">\n                  <input v-else-if=\"getInputType(filter.field) === 'radio'\"\n                         type=\"radio\"\n                         v-model=\"filter.value\"\n                         @change=\"filterChanged\">\n                  <input v-else\n                         :type=\"getInputType(filter.field)\"\n                         v-model=\"filter.value\"\n                         placeholder=\"Value\"\n                         @change=\"filterChanged\">\n                </template>\n              </div>\n            </div>\n            <button class=\"remove-btn\" @click=\"removeFilter(filter)\">×</button>\n          </div>\n\n          <!-- Field Select Dropdown -->\n          <div v-if=\"showColumnSelect\" class=\"field-select-container\">\n            <input \n              type=\"text\" \n              v-model=\"searchQuery\" \n              class=\"field-search\"\n              placeholder=\"Search fields...\"\n              @input=\"filterFields\"\n              ref=\"searchInput\"\n              autofocus\n            />\n            <select \n              ref=\"filterSelect\"\n              v-model=\"selectedColumn\" \n              @change=\"addNewFilter\" \n              class=\"field-select expanded\"\n              size=\"6\"\n            >\n              <option value=\"\" disabled>Select a field...</option>\n              <option \n                v-for=\"(field, index) in filteredColumns\" \n                :key=\"`${field}_${index}`\"\n                :value=\"field\"\n              >\n                {{ field }}\n              </option>\n            </select>\n            <button class=\"cancel-btn\" @click=\"showColumnSelect = false\">×</button>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"actions-panel\">\n      <button class=\"export-btn\" @click=\"exportData\" title=\"Export CSV\">\n        Export CSV\n      </button>\n    </div>\n  </div>\n</template>\n\n<script>\nexport default {\n  name: 'st-pivottable-controls',\n  \n  props: {\n    data: {\n      type: Array,\n      required: true\n    },\n    rows: {\n      type: Array,\n      default: () => []\n    },\n    columns: {\n      type: Array,\n      default: () => []\n    },\n    values: {\n      type: Array,\n      default: () => []\n    },\n    filters: {\n      type: Array,\n      default: () => []\n    },\n    hasNoResults: {\n      type: Boolean,\n      default: false\n    },\n    filterResults: {\n      type: Object,\n      default: () => ({})\n    }\n  },\n\n  data() {\n    return {\n      dragOverZone: null,\n      isDragging: false,\n      dragSourceZone: null,\n      collapsedSections: {\n        available: false,\n        rows: false,\n        columns: false,\n        values: false,\n        filters: false\n      },\n      showColumnSelect: false,\n      selectedColumn: '',\n      activeAddField: null,\n      selectedField: '',\n      searchQuery: '',\n      filteredFields: [],\n      nextValueId: 1,  // Counter for generating unique IDs\n      internalFilters: [...(this.filters || [])],  // Initialize internalFilters\n      config: {\n        rows: this.rows.map(row => ({\n          ...row,\n          sortBy: row.sortBy || 'label',\n          sortOrder: row.sortOrder || 'asc'\n        })),\n        columns: this.columns || [],\n        values: (this.values || []).map((value, index) => {\n          // Ensure each value has a unique ID using its position if no ID exists\n          const id = value.id || `${value.field}_${value.aggregation}_${index + 1}`;\n          return { ...value, id };\n        })\n      },\n      uniqueValuesCache: {},\n      isUpdatingConfig: false  // Add this flag to prevent recursive updates\n    }\n  },\n\n  computed: {\n    availableFields() {\n      console.log('Computing availableFields');\n      const fields = Object.keys(this.data[0] || {}).sort((a, b) => a.localeCompare(b));\n      console.log('Available fields:', fields);\n      return fields;\n    },\n\n    restrictedFields() {\n      console.log('Computing restrictedFields');\n      const usedFields = new Set([\n        ...this.config.rows.map(f => f.field),\n        ...this.config.columns.map(f => f.field)\n      ]);\n      console.log('Used fields:', Array.from(usedFields));\n      const fields = this.availableFields.filter(field => !usedFields.has(field));\n      console.log('Restricted fields:', fields);\n      return fields;\n    },\n\n    availableColumns() {\n      console.log('Computing availableColumns');\n      const fields = Object.keys(this.data[0] || {}).sort((a, b) => a.localeCompare(b));\n      console.log('Available columns:', fields);\n      return fields;\n    },\n\n    filteredColumns() {\n      console.log('Computing filteredColumns');\n      const query = this.searchQuery.toLowerCase();\n      const fields = this.availableColumns\n        .filter(field => field.toLowerCase().includes(query))\n        .sort((a, b) => a.localeCompare(b));\n      console.log('Filtered columns:', fields);\n      return fields;\n    }\n  },\n\n  methods: {\n    onDragStart(event, field, sourceZone = null) {\n      this.isDragging = true;\n      this.dragSourceZone = sourceZone;\n      \n      // Set data for transfer\n      event.dataTransfer.setData('text/plain', field);\n      event.dataTransfer.setData('source-zone', sourceZone || '');\n      \n      // If it's a Values or Filters item, only allow reordering within their own pod\n      if (sourceZone === 'values' || sourceZone === 'filters') {\n        event.dataTransfer.effectAllowed = 'copyMove';\n      }\n\n      // If dragging from within a zone, disable pointer events on other fields in that zone\n      if (sourceZone) {\n        const dropZone = event.target.closest('.drop-zone');\n        const fields = dropZone.querySelectorAll('.field-item');\n        fields.forEach(fieldEl => {\n          if (fieldEl !== event.target) {\n            fieldEl.style.pointerEvents = 'none';\n          }\n        });\n      }\n    },\n\n    onDragEnd() {\n      // Re-enable pointer events on all fields\n      document.querySelectorAll('.field-item').forEach(fieldEl => {\n        fieldEl.style.pointerEvents = '';\n      });\n      this.isDragging = false;\n      this.dragSourceZone = null;\n    },\n\n    onDragOver(event, zone) {\n      const sourceZone = this.dragSourceZone;\n      \n      // Prevent dropping Values items into other zones\n      if (sourceZone === 'values' && zone !== 'values') {\n        event.preventDefault();\n        return;\n      }\n      \n      // Prevent dropping Filters items into other zones\n      if (sourceZone === 'filters' && zone !== 'filters') {\n        event.preventDefault();\n        return;\n      }\n      \n      // Prevent dropping other items into Values or Filters zones\n      if ((sourceZone !== 'values' && zone === 'values') || \n          (sourceZone !== 'filters' && zone === 'filters')) {\n        event.preventDefault();\n        return;\n      }\n      \n      event.preventDefault();\n      this.dragOverZone = zone;\n      \n      const dropZone = event.currentTarget;\n      const fieldItems = Array.from(dropZone.querySelectorAll('.field-item'));\n      \n      if (fieldItems.length === 0) {\n        // If no items, show indicator at the top\n        this.dropPosition = 'top';\n        this.dropIndicatorStyle = { top: '40px' };\n        return;\n      }\n\n      // Find the insertion point\n      let insertBefore = null;\n      let insertIndex = 0;\n      for (let i = 0; i < fieldItems.length; i++) {\n        const rect = fieldItems[i].getBoundingClientRect();\n        const midY = rect.top + rect.height / 2;\n        \n        if (event.clientY < midY) {\n          insertBefore = fieldItems[i];\n          insertIndex = i;\n          break;\n        }\n      }\n\n      if (insertBefore) {\n        // Position indicator above this item\n        const rect = insertBefore.getBoundingClientRect();\n        const dropZoneRect = dropZone.getBoundingClientRect();\n        const relativeTop = rect.top - dropZoneRect.top;\n        this.dropIndicatorStyle = { top: `${relativeTop}px` };\n        this.dropPosition = insertIndex === 0 ? 'top' : null;\n      } else {\n        // Position indicator at the bottom\n        this.dropPosition = 'bottom';\n        this.dropIndicatorStyle = null;\n      }\n    },\n\n    onDrop(event, targetZone) {\n      event.preventDefault();\n      this.dragOverZone = null;\n      \n      const field = event.dataTransfer.getData('text/plain');\n      const sourceZone = event.dataTransfer.getData('source-zone');\n      \n      // Prevent dropping Values items into other zones\n      if (sourceZone === 'values' && targetZone !== 'values') {\n        return;\n      }\n      \n      // Prevent dropping Filters items into other zones\n      if (sourceZone === 'filters' && targetZone !== 'filters') {\n        return;\n      }\n      \n      // Prevent dropping other items into Values or Filters zones\n      if ((sourceZone !== 'values' && targetZone === 'values') || \n          (sourceZone !== 'filters' && targetZone === 'filters')) {\n        return;\n      }\n      \n      // Remove any drag-over classes\n      const fieldItems = Array.from(event.currentTarget.querySelectorAll('.field-item'));\n      fieldItems.forEach(item => item.classList.remove('drag-over-top', 'drag-over-bottom'));\n      \n      // Re-enable pointer events on all fields\n      document.querySelectorAll('.field-item').forEach(fieldEl => {\n        fieldEl.style.pointerEvents = '';\n      });\n      \n      // If source and target zones are the same, handle reordering\n      if (sourceZone === targetZone) {\n        let items;\n        let draggedItem;\n        \n        if (targetZone === 'filters') {\n          items = [...this.internalFilters];\n          draggedItem = items.find(f => f.field === field);\n        } else {\n          items = [...this.config[targetZone]];\n          draggedItem = items.find(f => f.field === field);\n        }\n        \n        if (!draggedItem) return;\n\n        let insertIndex = items.length;\n        \n        for (let i = 0; i < fieldItems.length; i++) {\n          const item = fieldItems[i];\n          const box = item.getBoundingClientRect();\n          const itemMiddle = box.top + box.height / 2;\n          \n          if (event.clientY < itemMiddle) {\n            insertIndex = i;\n            break;\n          }\n        }\n        \n        // Remove the dragged item from its current position\n        const draggedIndex = items.indexOf(draggedItem);\n        items.splice(draggedIndex, 1);\n        items.splice(insertIndex, 0, draggedItem);\n        \n        // Update the appropriate array\n        if (targetZone === 'filters') {\n          this.$emit('filtersChanged', items);\n        } else {\n          this.isUpdatingConfig = true;\n          try {\n            this.config[targetZone] = items;\n            this.$emit('configChanged', { ...this.config });\n          } finally {\n            this.isUpdatingConfig = false;\n          }\n        }\n      } else if (targetZone !== 'values' && targetZone !== 'filters') {  // Only handle cross-pod drops for non-Values/non-Filters zones\n        // Handle dropping between different zones (existing cross-pod logic)\n        let draggedField;\n\n        // Find the field in the source zone if it exists\n        if (sourceZone && this.config[sourceZone]) {\n          draggedField = this.config[sourceZone].find(f => f.field === field);\n        }\n\n        // If no dragged field found (from available fields) create a new one\n        if (!draggedField) {\n          draggedField = { field };\n        }\n\n        // Add default sort properties for rows\n        if (targetZone === 'rows') {\n          draggedField = {\n            ...draggedField,\n            sortBy: 'label',\n            sortOrder: 'asc'\n          };\n        }\n\n        // Remove from source zone if it exists\n        if (sourceZone && this.config[sourceZone]) {\n          const index = this.config[sourceZone].findIndex(f => f.field === field);\n          if (index !== -1) {\n            const newSourceFields = [...this.config[sourceZone]];\n            newSourceFields.splice(index, 1);\n            this.config[sourceZone] = newSourceFields;\n          }\n        }\n\n        // Add to target zone\n        this.isUpdatingConfig = true;\n        try {\n          this.config[targetZone] = [...this.config[targetZone], draggedField];\n          this.$emit('configChanged', { ...this.config });\n        } finally {\n          this.isUpdatingConfig = false;\n        }\n      }\n      \n      this.isDragging = false;\n      this.dragSourceZone = null;\n      this.dropPosition = null;\n      this.dropIndicatorStyle = null;\n    },\n\n    removeField(zone, field) {\n      console.log('Removing field:', { zone, field });\n      const index = this.config[zone].findIndex(f => f.field === field.field);\n      if (index !== -1) {\n        // Create a new array instead of modifying the existing one\n        this.config[zone] = [\n          ...this.config[zone].slice(0, index),\n          ...this.config[zone].slice(index + 1)\n        ];\n        console.log('New config after removal:', this.config[zone]);\n        this.$emit('configChanged', { ...this.config });\n      }\n    },\n\n    toggleSection(section) {\n      this.collapsedSections[section] = !this.collapsedSections[section]\n    },\n\n    removeFilter(filter) {\n      const index = this.internalFilters.indexOf(filter);\n      if (index !== -1) {\n        this.internalFilters.splice(index, 1);\n        this.$emit('filtersChanged', this.internalFilters);\n        //this.onFilterChange();\n      }\n    },\n\n    filterChanged() {\n      console.log('st-pivottable-controls:filterChanged: ', this.internalFilters);\n      // Create a new array with the updated filters to ensure reactivity\n      const updatedFilters = [...this.internalFilters];\n      this.$emit('filtersChanged', updatedFilters);\n      //this.onFilterChange();\n    },\n\n    getInputType(column) {\n      // Determine input type based on the first non-null value in the column\n      const firstValue = this.data.find(row => row[column] != null)?.[column];\n      if (typeof firstValue === 'number') return 'number';\n      if (typeof firstValue === 'boolean') return 'checkbox';\n      if (firstValue instanceof Date) return 'date';\n      return 'text';\n    },\n\n    getDefaultCondition(column) {\n      const firstValue = this.data.find(row => row[column] != null)?.[column];\n      \n      if (typeof firstValue === 'number') return 'equals';\n      if (typeof firstValue === 'boolean') return 'equals';\n      if (firstValue instanceof Date) return 'equals';\n      return 'contains';\n    },\n\n    getDefaultValue(column) {\n      const firstValue = this.data.find(row => row[column] != null)?.[column];\n      \n      if (typeof firstValue === 'number') return 0;\n      if (typeof firstValue === 'boolean') return true;\n      if (firstValue instanceof Date) return new Date().toISOString().split('T')[0];\n      return '';\n    },\n\n    addNewFilter() {\n      if (this.selectedColumn) {\n        const newFilter = {\n          field: this.selectedColumn,\n          filterType: 'condition',\n          condition: this.getDefaultCondition(this.selectedColumn),\n          value: this.getDefaultValue(this.selectedColumn),\n          selectedValues: []\n        };\n        // Create a new array with the new filter\n        this.internalFilters = [...this.internalFilters, newFilter];\n        console.log('st-pivottable-controls:addNewFilter: ', this.internalFilters);\n        this.$emit('filtersChanged', this.internalFilters);\n        \n        this.selectedColumn = '';\n        this.showColumnSelect = false;\n        //this.onFilterChange();\n      }\n    },\n\n    addNewField(zone) {\n      console.log('Adding new field:', { zone, selectedField: this.selectedField });\n      if (!this.selectedField) return;\n      \n      let newField = { field: this.selectedField };\n      let newId;\n\n      // Add zone-specific properties\n      switch (zone) {\n        case 'rows': {\n          newField = {\n            ...newField,\n            sortBy: 'label',\n            sortOrder: 'asc'\n          };\n          break;\n        }\n        case 'values': {\n          // Determine best default aggregation based on field type\n          const firstValue = this.data.find(row => row[this.selectedField] != null)?.[this.selectedField];\n          const defaultAggregation = typeof firstValue === 'number' ? 'sum' : 'count';\n          \n          // Generate a unique ID based on the current values length plus 1\n          newId = `${this.selectedField}_${defaultAggregation}_${this.config.values.length + 1}`;\n          console.log('Creating new value field:', { field: this.selectedField, aggregation: defaultAggregation, id: newId });\n          \n          newField = {\n            ...newField,\n            aggregation: defaultAggregation,\n            id: newId\n          };\n          break;\n        }\n      }\n      \n      // Create a new array instead of pushing to the existing one\n      this.config[zone] = [...this.config[zone], newField];\n      console.log('New config after addition:', this.config[zone]);\n      \n      // Emit the change with a new config object\n      this.$emit('configChanged', { ...this.config });\n      \n      this.selectedField = '';\n      this.activeAddField = null;\n    },\n\n    onSortChange() {\n      console.log('Sort changed, emitting new config');\n      this.$emit('configChanged', { ...this.config });\n    },\n\n    showFieldSelect(zone) {\n      this.activeAddField = zone;\n      this.searchQuery = '';\n      // Initialize with appropriate field list based on zone\n      this.filteredFields = (zone === 'rows' || zone === 'columns') \n        ? this.restrictedFields \n        : this.availableFields;\n      this.$nextTick(() => {\n        const searchInput = this.$refs.searchInput;\n        if (searchInput) {\n          searchInput.focus();\n        }\n      });\n    },\n\n    showFilterSelect() {\n      this.showColumnSelect = true;\n      this.searchQuery = '';\n      // Show all fields for filters\n      this.filteredFields = this.availableFields;\n      this.$nextTick(() => {\n        const searchInput = this.$refs.searchInput;\n        if (searchInput) {\n          searchInput.focus();\n        }\n      });\n    },\n\n    filterFields() {\n      console.log('Filtering fields');\n      const query = this.searchQuery.toLowerCase();\n      const sourceFields = (this.activeAddField === 'rows' || this.activeAddField === 'columns')\n        ? this.restrictedFields\n        : this.availableFields;\n      \n      this.filteredFields = sourceFields\n        .filter(field => field.toLowerCase().includes(query))\n        .sort((a, b) => a.localeCompare(b));\n      console.log('Filtered fields:', this.filteredFields);\n    },\n\n    closeDropdown() {\n      if (this.activeAddField) {\n        this.activeAddField = null;\n      }\n      if (this.showColumnSelect) {\n        this.showColumnSelect = false;\n      }\n      this.selectedField = '';\n      this.selectedColumn = '';\n      this.searchQuery = '';\n    },\n\n    handleKeydown(event) {\n      if (event.key === 'Escape') {\n        this.closeDropdown();\n      }\n    },\n\n    onAggregationChange(field) {\n      if (field.aggregation === 'custom') {\n        // Initialize formula if not exists\n        if (!field.formula) {\n          field.formula = '';\n        }\n        // Validate empty formula\n        this.validateFormula(field);\n      } else {\n        // Clean up formula-related properties when switching back to standard aggregation\n        delete field.formula;\n        delete field.formulaError;\n      }\n      \n      // Update the field's ID while maintaining its position in the values array\n      const fieldIndex = this.config.values.findIndex(v => v.id === field.id);\n      field.id = `${field.field}_${field.aggregation}_${fieldIndex + 1}`;\n      \n      // Create a new config object to ensure proper reactivity\n      const newConfig = {\n        ...this.config,\n        values: this.config.values.map(v => v === field ? { ...field } : v)\n      };\n      \n      // Emit the change with the new config\n      this.$emit('configChanged', newConfig);\n    },\n\n    onLabelChange(field) {\n      // Create a new config object to ensure proper reactivity\n      const newConfig = {\n        ...this.config,\n        values: this.config.values.map(v => v === field ? { ...field } : v)\n      };\n      \n      // Emit the change with the new config\n      this.$emit('configChanged', newConfig);\n    },\n\n    toggleFilterType(filter) {\n      filter.filterType = filter.filterType === 'condition' ? 'values' : 'condition';\n      if (filter.filterType === 'values') {\n        // Initialize all necessary properties for values filter type\n        filter.selectedValues = [];\n        filter.searchQuery = '';\n      } else {\n        filter.condition = this.getDefaultCondition(filter.field);\n        filter.value = '';\n      }\n      this.filterChanged();\n    },\n\n    getUniqueValues(column) {\n      if (!this.uniqueValuesCache[column]) {\n        const values = new Set();\n        this.data.forEach(row => {\n          if (row[column] !== null && row[column] !== undefined) {\n            values.add(row[column]);\n          }\n        });\n        this.uniqueValuesCache[column] = Array.from(values).sort((a, b) => {\n          return String(a).localeCompare(String(b));\n        });\n      }\n      return this.uniqueValuesCache[column];\n    },\n\n    selectAllValues(filter) {\n      filter.selectedValues = [...this.getUniqueValues(filter.field)];\n      this.filterChanged();\n    },\n\n    clearValues(filter) {\n      filter.selectedValues = [];\n      this.filterChanged();\n    },\n\n    filteredValues(filter) {\n      const values = this.getUniqueValues(filter.field);\n      if (!filter.searchQuery) return values;\n      \n      const searchTerm = (filter.searchQuery || '').toLowerCase();\n      return values.filter(value => \n        String(value).toLowerCase().includes(searchTerm)\n      );\n    },\n\n    formatValue(value) {\n      return typeof value === 'number' ? value.toLocaleString() : value;\n    },\n\n    validateAndUpdateFormula(field) {\n      console.log('FORMULA_UPDATE: Validating formula:', field.formula);\n      const isValid = this.validateFormula(field);\n      \n      if (isValid) {\n        console.log('FORMULA_UPDATE: Formula is valid, updating config');\n        // Create a new config object to ensure proper reactivity\n        const newConfig = {\n          ...this.config,\n          values: this.config.values.map(v => v === field ? { ...field } : v)\n        };\n        \n        // Emit the change with the new config\n        this.$emit('configChanged', newConfig);\n      }\n    },\n\n    validateFormula(field) {\n      // Reset error state\n      field.formulaError = null;\n      \n      if (!field.formula || !field.formula.trim()) {\n        field.formulaError = 'Formula cannot be empty';\n        return false;\n      }\n\n      // Extract field references from formula\n      const fieldRefs = field.formula.match(/\\{([^}]+)\\}/g) || [];\n      const functionCalls = field.formula.match(/\\b(SUM|COUNT|COUNTA|COUNTUNIQUE|AVERAGE|MAX|MIN|MEDIAN|STDEV|STDEVP|VAR|VARP)\\s*\\{([^}]+)\\}/g) || [];\n      \n      // Check if formula contains at least one field reference or function call\n      if (fieldRefs.length === 0 && functionCalls.length === 0) {\n        field.formulaError = 'Formula must reference at least one field using {fieldName} or a function call like SUM{fieldName}';\n        return false;\n      }\n\n      // Validate that all referenced fields exist in source data\n      const availableFields = Object.keys(this.data[0] || {});\n      const allFieldRefs = [...fieldRefs];\n      \n      // Extract field references from function calls\n      functionCalls.forEach(func => {\n        const match = func.match(/\\{([^}]+)\\}/);\n        if (match) {\n          allFieldRefs.push(match[0]);\n        }\n      });\n\n      // Validate all field references\n      for (const ref of new Set(allFieldRefs)) {  // Use Set to remove duplicates\n        const fieldName = ref.slice(1, -1); // Remove { }\n        if (!availableFields.includes(fieldName)) {\n          field.formulaError = `Field \"${fieldName}\" not found in source data`;\n          return false;\n        }\n      }\n\n      // Basic syntax validation (this can be enhanced later)\n      try {\n        // Replace field references and function calls with 1 for validation\n        let testFormula = field.formula;\n        \n        // First replace function calls\n        testFormula = testFormula.replace(/\\b(SUM|COUNT|COUNTA|COUNTUNIQUE|AVERAGE|MAX|MIN|MEDIAN|STDEV|STDEVP|VAR|VARP)\\s*\\{[^}]+\\}/g, '1');\n        \n        // Then replace remaining field references\n        testFormula = testFormula.replace(/\\{[^}]+\\}/g, '1');\n        \n        // Use Function instead of eval for safer evaluation\n        new Function(`return ${testFormula}`)();\n        return true;\n      } catch (error) {\n        field.formulaError = 'Invalid formula syntax';\n        return false;\n      }\n    },\n\n    exportData() {\n        this.$emit('export');\n    }\n  },\n\n  mounted() {\n    document.addEventListener('keydown', this.handleKeydown);\n  },\n\n  beforeDestroy() {\n    document.removeEventListener('keydown', this.handleKeydown);\n  },\n\n  watch: {\n    rows: {\n      handler(newRows) {\n        if (this.isUpdatingConfig) return;  // Skip if already updating\n        \n        this.isUpdatingConfig = true;\n        try {\n          this.config.rows = newRows.map(row => ({\n            ...row,\n            sortBy: row.sortBy || 'label',\n            sortOrder: row.sortOrder || 'asc'\n          }));\n        } finally {\n          this.isUpdatingConfig = false;\n        }\n      },\n      deep: true\n    },\n    columns: {\n      handler(newColumns) {\n        if (this.isUpdatingConfig) return;  // Skip if already updating\n        \n        this.isUpdatingConfig = true;\n        try {\n          this.config.columns = newColumns;\n        } finally {\n          this.isUpdatingConfig = false;\n        }\n      },\n      deep: true\n    },\n    values: {\n      handler(newValues) {\n        if (this.isUpdatingConfig) return;  // Skip if already updating\n        \n        this.isUpdatingConfig = true;\n        try {\n          this.config.values = newValues.map(value => ({\n            ...value,\n            id: value.id || `${value.field}_${value.aggregation}_${this.nextValueId++}`\n          }));\n        } finally {\n          this.isUpdatingConfig = false;\n        }\n      },\n      deep: true\n    },\n    filters: {\n      handler(newFilters) {\n        console.log('[PV Controls] watch.filters.handler: ', newFilters);\n        if (this.isUpdatingConfig) return;  // Skip if already updating\n        \n        this.isUpdatingConfig = true;\n        try {\n          this.internalFilters = [...newFilters];\n        } finally {\n          this.isUpdatingConfig = false;\n        }\n      },\n      deep: true\n    }\n  }\n}\n</script>\n\n<style lang=\"scss\" scoped>\n.fields-container {\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n  width: 300px;\n  background-color: var(--st-dashboard-bg-0);\n  padding: 6px;\n  border-radius: 8px;\n  border: 1px solid var(--st-color-neutral);\n  height: 100%;\n  box-sizing: border-box;\n  position: relative;\n}\n\n.zones-container {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  flex: 1;\n  overflow-y: auto;\n  padding-bottom: 12px; // Add padding to prevent content from being hidden behind actions panel\n  \n  // Improve scrollbar styling\n  &::-webkit-scrollbar {\n    width: 8px;\n    height: 8px;\n  }\n\n  &::-webkit-scrollbar-track {\n    background: transparent;\n  }\n\n  &::-webkit-scrollbar-thumb {\n    background: var(--st-color-neutral);\n    border-radius: 4px;\n\n    &:hover {\n      background: color-mix(in srgb, var(--st-color-neutral) 80%, transparent);\n    }\n  }\n\n  &::-webkit-scrollbar-corner {\n    background: transparent;\n  }\n}\n\n.field-item {\n  position: relative;\n  z-index: 1;\n  padding: 12px 12px 12px 12px;\n  background: #f8f9fa;\n  border: 1px solid #e9ecef;\n  border-radius: 4px;\n  margin-bottom: 8px;\n  cursor: move;\n  display: flex;\n  justify-content: space-between;\n  align-items: flex-start;\n  font-size: 13px;\n  \n  &:last-child {\n    margin-bottom: 0;\n  }\n  \n  &.dropped {\n    background: color-mix(in srgb, var(--st-text-2) 5%, transparent);\n    border-color: var(--st-color-neutral);\n    color: var(--st-text-1);\n\n    &.has-no-results {\n      background: color-mix(in srgb, #ff0000 15%, transparent);\n      border-color: color-mix(in srgb, #ff0000 35%, transparent);\n\n      .filter-controls {\n        select, input {\n          border-color: color-mix(in srgb, #ff0000 35%, transparent);\n          \n          &:focus {\n            border-color: #ef5350;\n          }\n        }\n      }\n    }\n  }\n  \n  &.drag-over-top {\n    border-top: 2px solid #0066cc;\n  }\n  \n  &.drag-over-bottom {\n    border-bottom: 2px solid #0066cc;\n  }\n}\n\n.remove-btn {\n  position: absolute;\n  top: 2px;\n  right: 2px;\n  background: none;\n  border: none;\n  color: #adb5bd;\n  cursor: pointer;\n  padding: 4px;\n  font-size: 16px;\n  line-height: 1;\n  z-index: 2;\n  border-radius: 4px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 20px;\n  height: 20px;\n  \n  &:hover {\n    color: #495057;\n    background-color: rgba(0, 0, 0, 0.05);\n  }\n}\n\n.field-content {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  width: 100%;\n\n  .label-input {\n    width: 100%;\n    padding: 4px;\n    border: 1px solid var(--st-color-neutral);\n    background: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n    color: var(--st-text-1);\n    border-radius: 3px;\n    font-size: 12px;\n    \n    &:focus {\n      outline: none;\n      border-color: #0066cc;\n    }\n\n    &::placeholder {\n      color: var(--st-text-2);\n    }\n  }\n}\n\n.section {\n  border: 1px solid var(--st-color-neutral);\n  border-radius: 4px;\n  background: var(--st-dashboard-bg-1);\n\n  .section-header {\n    padding: 5px 10px;\n    background: var(--st-dashboard-bg-2);\n    border-bottom: 1px solid var(--st-color-neutral);\n    cursor: pointer;\n    display: flex;\n    justify-content: space-between;\n    align-items: center;\n    user-select: none;\n\n    &:hover {\n      background: color-mix(in srgb, var(--st-dashboard-bg-2), var(--st-text-1) 10%);\n    }\n\n    h4 {\n      margin: 0;\n      color: var(--st-text-1);\n      font-size: 14px;\n      font-weight: 600;\n    }\n  }\n\n  .section-content {\n    padding: 7px 5px;\n    transition: max-height 0.3s ease-in-out;\n    overflow: visible;\n    position: relative;\n\n    &.collapsed {\n      max-height: 0;\n      padding: 0;\n      overflow: hidden;\n    }\n  }\n}\n\n.header-controls {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n\n.add-btn {\n  background: none;\n  border: none;\n  color: var(--st-text-2);\n  cursor: pointer;\n  padding: 2px 6px;\n  font-size: 16px;\n  line-height: 1;\n  border-radius: 4px;\n  \n  &:hover {\n    color: var(--st-text-1);\n    background-color: color-mix(in srgb, var(--st-text-1) 10%, transparent);\n  }\n}\n\n.toggle-icon {\n  font-size: 12px;\n  color: #6c757d;\n  transition: transform 0.3s ease;\n\n  &.collapsed {\n    transform: rotate(-90deg);\n  }\n}\n\n// Update existing styles to work with new structure\n.available-fields, .drop-zone {\n  margin-bottom: 16px;\n  \n  &:last-child {\n    margin-bottom: 0;\n  }\n}\n\n.field-item {\n  margin-bottom: 8px;\n  \n  &:last-child {\n    margin-bottom: 0;\n  }\n}\n\n.filter-controls {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  width: 100%;\n  \n  select, input {\n    width: 100%;\n    padding: 4px;\n    \n    border: 1px solid var(--st-color-neutral);\n    background: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n    color: var(--st-text-1);\n\n    border-radius: 3px;\n    font-size: 12px;\n    \n    &:focus {\n      outline: none;\n      border-color: #0066cc;\n    }\n  }\n}\n\n.add-filter-section {\n  padding: 8px;\n  border-top: 1px solid #eee;\n  margin-top: 8px;\n}\n\n.column-select-container {\n  display: flex;\n  gap: 8px;\n  align-items: center;\n  width: 100%;\n}\n\n.column-select {\n  flex: 1;\n  padding: 6px 8px;\n  border: 1px solid #ddd;\n  border-radius: 4px;\n  font-size: 13px;\n  background-color: white;\n  \n  &:focus {\n    outline: none;\n    border-color: #0066cc;\n  }\n}\n\n.cancel-btn {\n  background: none;\n  border: none;\n  color: #adb5bd;\n  cursor: pointer;\n  padding: 4px;\n  font-size: 16px;\n  line-height: 1;\n  border-radius: 4px;\n  \n  &:hover {\n    color: #495057;\n    background-color: #f8f9fa;\n  }\n}\n\n.add-filter-btn {\n  width: 100%;\n  padding: 6px 12px;\n  background-color: #f8f9fa;\n  border: 1px dashed #adb5bd;\n  border-radius: 4px;\n  color: #495057;\n  cursor: pointer;\n  font-size: 13px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 4px;\n  \n  &:hover {\n    background-color: #e9ecef;\n    border-color: #495057;\n  }\n  \n  &::before {\n    content: '+';\n    font-size: 16px;\n    line-height: 1;\n    margin-right: 4px;\n  }\n}\n\n.add-field-section {\n  display: none;\n}\n\n.field-select-container {\n  position: absolute;\n  top: 47px;\n  right: 4px;\n  width: calc(100% - 25px);\n  background: var(--st-dashboard-bg-1);\n  border: solid 1px var(--st-color-neutral);\n  border-radius: 4px;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);\n  padding: 8px;\n  z-index: 1000;\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n.field-search {\n  width: 100%;\n  padding: 6px 8px;\n  border: 1px solid #ddd;\n  border-radius: 4px;\n  font-size: 13px;\n  box-sizing: border-box;\n  \n  &:focus {\n    outline: none;\n    border-color: #0066cc;\n  }\n}\n\n.field-select {\n  width: 100%;\n  border-radius: 4px;\n  font-size: 13px;\n  background-color: var(--st-dashboard-bg-1);\n  \n  &.expanded {\n    max-height: 200px;\n    overflow-y: auto;\n\n    option {\n      padding: 6px 8px;\n      color: var(--st-text-1);\n      \n      &:hover {\n        background-color: color-mix(in srgb, var(--st-text-1) 10%, transparent);\n      }\n      \n      &[value=\"\"] {\n        color: #6c757d;\n        font-style: italic;\n      }\n    }\n  }\n  \n  &:focus {\n    outline: none;\n    border-color: #0066cc;\n  }\n}\n\n.cancel-btn {\n  position: absolute;\n  top: 11px;\n  right: 11px;\n  width: 20px;\n  background: none;\n  border: none;\n  color: #adb5bd;\n  cursor: pointer;\n  padding: 4px;\n  font-size: 16px;\n  line-height: 1;\n  border-radius: 4px;\n  \n  &:hover {\n    color: #495057;\n    background-color: #f8f9fa;\n  }\n}\n\n.field-content {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  width: 100%;\n}\n\n.field-controls {\n  display: flex;\n  gap: 4px;\n  align-items: center;\n  \n\n}\n\nselect {\n    font-size: 12px;\n    padding: 2px 4px;\n    border: 1px solid var(--st-color-neutral);\n    border-radius: 3px;\n    background: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n    color: var(--st-text-1);\n    \n    &.sort-select {\n      width: 110px;\n    }\n    \n    &.order-select {\n      width: 90px;\n    }\n  }\n\n.field-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  margin-bottom: 12px;\n\n  .field-name {\n    /* font-size: 16px;\n    font-weight: 500; */\n  }\n}\n\n.filter-type-selector {\n  display: flex;\n  padding: 2px;\n  border-radius: 6px;\n  border: 1px solid var(--st-color-neutral);\n  margin-bottom: 12px;\n}\n\n.filter-type-btn {\n  flex: 1;\n  padding: 2px 5px;\n  font-size: 14px;\n  border: none;\n  background: transparent;\n  cursor: pointer;\n  border-radius: 4px;\n  color: var(--st-text-2);\n  transition: all 0.2s ease;\n\n  &.active {\n    background: color-mix(in srgb, var(--st-text-1) 15%, transparent);\n    color: var(--st-text-1);\n    font-weight: 500;\n  }\n\n  &:hover:not(.active) {\n    background: color-mix(in srgb, var(--st-text-1) 8%, transparent);\n  }\n}\n\n.values-filter {\n  /* background: #fff; */\n  border: 1px solid var(--st-color-neutral);\n  border-radius: 6px;\n  overflow: hidden;\n}\n\n.values-list {\n  max-height: 300px;\n  overflow-y: auto;\n}\n\n.values-list-header {\n  position: sticky;\n  top: 0;\n  background: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n  border-bottom: 1px solid var(--st-color-neutral);\n  padding: 12px;\n  z-index: 1;\n}\n\n.search-container {\n  margin-bottom: 12px;\n}\n\n.values-search {\n  width: 100%;\n  padding: 8px 12px;\n  border: 1px solid #ddd;\n  border-radius: 6px;\n  font-size: 14px;\n  background: #f8f8f8;\n  \n  &:focus {\n    outline: none;\n    border-color: #0066cc;\n    background: #fff;\n  }\n\n  &::placeholder {\n    color: #999;\n  }\n}\n\n.values-actions {\n  display: flex;\n  gap: 8px;\n}\n\n.action-btn {\n  flex: 1;\n  padding: 2px 6px;\n  font-size: 14px;\n  border: 1px solid var(--st-color-neutral);\n  border-radius: 6px;\n  background: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n  cursor: pointer;\n  color: var(--st-text-1);\n  transition: all 0.2s ease;\n\n  &:hover {\n    background: color-mix(in srgb, var(--st-text-1) 15%, transparent);\n  }\n}\n\n.values-options {\n  padding: 8px 12px;\n}\n\n.value-option {\n  display: flex;\n  align-items: center;\n  padding: 2px 2px;\n  cursor: pointer;\n  border-radius: 4px;\n  transition: background-color 0.2s ease;\n\n  &:hover {\n    background: color-mix(in srgb, var(--st-text-1) 15%, transparent);\n  }\n}\n\n.checkbox-wrapper {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 20px;\n  height: 20px;\n  margin-right: 12px;\n\n  input[type=\"checkbox\"] {\n    width: 16px;\n    height: 16px;\n    margin: 0;\n    cursor: pointer;\n  }\n}\n\n.value-label {\n  flex: 1;\n  font-size: 14px;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n// Scrollbar styling\n.values-list {\n  &::-webkit-scrollbar {\n    width: 8px;\n  }\n\n  &::-webkit-scrollbar-track {\n    background: #f1f1f1;\n    border-radius: 4px;\n  }\n\n  &::-webkit-scrollbar-thumb {\n    background: #ccc;\n    border-radius: 4px;\n\n    &:hover {\n      background: #bbb;\n    }\n  }\n}\n\n// Condition filter styles\n.condition-filter {\n  select, input {\n    width: 100%;\n    /* padding: 8px 12px; */\n    /* border: 1px solid #ddd; */\n    border-radius: 6px;\n    font-size: 14px;\n    margin-bottom: 8px;\n    /* background: #fff; */\n    box-sizing: border-box;\n\n    &:focus {\n      outline: none;\n      border-color: #0066cc;\n    }\n  }\n\n  input {\n    padding: 6px 10px;\n  }\n}\n\n.remove-btn {\n  position: absolute;\n  top: 2px;\n  right: 2px;\n  background: none;\n  border: none;\n  color: #999;\n  font-size: 18px;\n  cursor: pointer;\n  padding: 4px 8px;\n  border-radius: 4px;\n\n  &:hover {\n    color: #666;\n    background: #f0f0f0;\n  }\n}\n\n.formula-input-container {\n  margin-top: 8px;\n  width: 100%;\n}\n\n.formula-input {\n  width: 100%;\n  padding: 8px;\n  border: 1px solid #ddd;\n  border-radius: 4px;\n  font-size: 13px;\n  \n  &:focus {\n    outline: none;\n    border-color: #0066cc;\n  }\n  \n  &.error {\n    border-color: #dc3545;\n    background-color: #fff3f3;\n  }\n}\n\n.formula-error {\n  color: #dc3545;\n  font-size: 12px;\n  margin-top: 4px;\n  padding: 4px;\n  background-color: #fff3f3;\n  border-radius: 4px;\n}\n\n.actions-panel {\n  position: sticky;\n  bottom: 0;\n  left: 0;\n  right: 0;\n  padding: 12px;\n  background: var(--st-dashboard-bg-0);\n  border-top: 1px solid var(--st-color-neutral);\n  display: flex;\n  justify-content: center;\n  margin: 0 -6px -6px -6px;\n  border-radius: 0 0 8px 8px;\n  flex-shrink: 0; // Prevent panel from shrinking\n  z-index: 10; // Ensure panel stays above scrolled content\n\n  .export-btn {\n    width: 100%;\n    padding: 8px;\n    background: var(--st-dashboard-bg-2);\n    border: 1px solid var(--st-color-neutral);\n    border-radius: 4px;\n    color: var(--st-text-1);\n    cursor: pointer;\n    font-size: 13px;\n    font-weight: 500;\n    \n    &:hover {\n      background: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n    }\n  }\n}\n</style> ",".fields-container {\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n  width: 300px;\n  background-color: var(--st-dashboard-bg-0);\n  padding: 6px;\n  border-radius: 8px;\n  border: 1px solid var(--st-color-neutral);\n  height: 100%;\n  box-sizing: border-box;\n  position: relative;\n}\n\n.zones-container {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  flex: 1;\n  overflow-y: auto;\n  padding-bottom: 12px;\n}\n.zones-container::-webkit-scrollbar {\n  width: 8px;\n  height: 8px;\n}\n.zones-container::-webkit-scrollbar-track {\n  background: transparent;\n}\n.zones-container::-webkit-scrollbar-thumb {\n  background: var(--st-color-neutral);\n  border-radius: 4px;\n}\n.zones-container::-webkit-scrollbar-thumb:hover {\n  background: color-mix(in srgb, var(--st-color-neutral) 80%, transparent);\n}\n.zones-container::-webkit-scrollbar-corner {\n  background: transparent;\n}\n\n.field-item {\n  position: relative;\n  z-index: 1;\n  padding: 12px 12px 12px 12px;\n  background: #f8f9fa;\n  border: 1px solid #e9ecef;\n  border-radius: 4px;\n  margin-bottom: 8px;\n  cursor: move;\n  display: flex;\n  justify-content: space-between;\n  align-items: flex-start;\n  font-size: 13px;\n}\n.field-item:last-child {\n  margin-bottom: 0;\n}\n.field-item.dropped {\n  background: color-mix(in srgb, var(--st-text-2) 5%, transparent);\n  border-color: var(--st-color-neutral);\n  color: var(--st-text-1);\n}\n.field-item.dropped.has-no-results {\n  background: color-mix(in srgb, #ff0000 15%, transparent);\n  border-color: color-mix(in srgb, #ff0000 35%, transparent);\n}\n.field-item.dropped.has-no-results .filter-controls select, .field-item.dropped.has-no-results .filter-controls input {\n  border-color: color-mix(in srgb, #ff0000 35%, transparent);\n}\n.field-item.dropped.has-no-results .filter-controls select:focus, .field-item.dropped.has-no-results .filter-controls input:focus {\n  border-color: #ef5350;\n}\n.field-item.drag-over-top {\n  border-top: 2px solid #0066cc;\n}\n.field-item.drag-over-bottom {\n  border-bottom: 2px solid #0066cc;\n}\n\n.remove-btn {\n  position: absolute;\n  top: 2px;\n  right: 2px;\n  background: none;\n  border: none;\n  color: #adb5bd;\n  cursor: pointer;\n  padding: 4px;\n  font-size: 16px;\n  line-height: 1;\n  z-index: 2;\n  border-radius: 4px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 20px;\n  height: 20px;\n}\n.remove-btn:hover {\n  color: #495057;\n  background-color: rgba(0, 0, 0, 0.05);\n}\n\n.field-content {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  width: 100%;\n}\n.field-content .label-input {\n  width: 100%;\n  padding: 4px;\n  border: 1px solid var(--st-color-neutral);\n  background: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n  color: var(--st-text-1);\n  border-radius: 3px;\n  font-size: 12px;\n}\n.field-content .label-input:focus {\n  outline: none;\n  border-color: #0066cc;\n}\n.field-content .label-input::placeholder {\n  color: var(--st-text-2);\n}\n\n.section {\n  border: 1px solid var(--st-color-neutral);\n  border-radius: 4px;\n  background: var(--st-dashboard-bg-1);\n}\n.section .section-header {\n  padding: 5px 10px;\n  background: var(--st-dashboard-bg-2);\n  border-bottom: 1px solid var(--st-color-neutral);\n  cursor: pointer;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  user-select: none;\n}\n.section .section-header:hover {\n  background: color-mix(in srgb, var(--st-dashboard-bg-2), var(--st-text-1) 10%);\n}\n.section .section-header h4 {\n  margin: 0;\n  color: var(--st-text-1);\n  font-size: 14px;\n  font-weight: 600;\n}\n.section .section-content {\n  padding: 7px 5px;\n  transition: max-height 0.3s ease-in-out;\n  overflow: visible;\n  position: relative;\n}\n.section .section-content.collapsed {\n  max-height: 0;\n  padding: 0;\n  overflow: hidden;\n}\n\n.header-controls {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n\n.add-btn {\n  background: none;\n  border: none;\n  color: var(--st-text-2);\n  cursor: pointer;\n  padding: 2px 6px;\n  font-size: 16px;\n  line-height: 1;\n  border-radius: 4px;\n}\n.add-btn:hover {\n  color: var(--st-text-1);\n  background-color: color-mix(in srgb, var(--st-text-1) 10%, transparent);\n}\n\n.toggle-icon {\n  font-size: 12px;\n  color: #6c757d;\n  transition: transform 0.3s ease;\n}\n.toggle-icon.collapsed {\n  transform: rotate(-90deg);\n}\n\n.available-fields, .drop-zone {\n  margin-bottom: 16px;\n}\n.available-fields:last-child, .drop-zone:last-child {\n  margin-bottom: 0;\n}\n\n.field-item {\n  margin-bottom: 8px;\n}\n.field-item:last-child {\n  margin-bottom: 0;\n}\n\n.filter-controls {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  width: 100%;\n}\n.filter-controls select, .filter-controls input {\n  width: 100%;\n  padding: 4px;\n  border: 1px solid var(--st-color-neutral);\n  background: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n  color: var(--st-text-1);\n  border-radius: 3px;\n  font-size: 12px;\n}\n.filter-controls select:focus, .filter-controls input:focus {\n  outline: none;\n  border-color: #0066cc;\n}\n\n.add-filter-section {\n  padding: 8px;\n  border-top: 1px solid #eee;\n  margin-top: 8px;\n}\n\n.column-select-container {\n  display: flex;\n  gap: 8px;\n  align-items: center;\n  width: 100%;\n}\n\n.column-select {\n  flex: 1;\n  padding: 6px 8px;\n  border: 1px solid #ddd;\n  border-radius: 4px;\n  font-size: 13px;\n  background-color: white;\n}\n.column-select:focus {\n  outline: none;\n  border-color: #0066cc;\n}\n\n.cancel-btn {\n  background: none;\n  border: none;\n  color: #adb5bd;\n  cursor: pointer;\n  padding: 4px;\n  font-size: 16px;\n  line-height: 1;\n  border-radius: 4px;\n}\n.cancel-btn:hover {\n  color: #495057;\n  background-color: #f8f9fa;\n}\n\n.add-filter-btn {\n  width: 100%;\n  padding: 6px 12px;\n  background-color: #f8f9fa;\n  border: 1px dashed #adb5bd;\n  border-radius: 4px;\n  color: #495057;\n  cursor: pointer;\n  font-size: 13px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 4px;\n}\n.add-filter-btn:hover {\n  background-color: #e9ecef;\n  border-color: #495057;\n}\n.add-filter-btn::before {\n  content: \"+\";\n  font-size: 16px;\n  line-height: 1;\n  margin-right: 4px;\n}\n\n.add-field-section {\n  display: none;\n}\n\n.field-select-container {\n  position: absolute;\n  top: 47px;\n  right: 4px;\n  width: calc(100% - 25px);\n  background: var(--st-dashboard-bg-1);\n  border: solid 1px var(--st-color-neutral);\n  border-radius: 4px;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);\n  padding: 8px;\n  z-index: 1000;\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n.field-search {\n  width: 100%;\n  padding: 6px 8px;\n  border: 1px solid #ddd;\n  border-radius: 4px;\n  font-size: 13px;\n  box-sizing: border-box;\n}\n.field-search:focus {\n  outline: none;\n  border-color: #0066cc;\n}\n\n.field-select {\n  width: 100%;\n  border-radius: 4px;\n  font-size: 13px;\n  background-color: var(--st-dashboard-bg-1);\n}\n.field-select.expanded {\n  max-height: 200px;\n  overflow-y: auto;\n}\n.field-select.expanded option {\n  padding: 6px 8px;\n  color: var(--st-text-1);\n}\n.field-select.expanded option:hover {\n  background-color: color-mix(in srgb, var(--st-text-1) 10%, transparent);\n}\n.field-select.expanded option[value=\"\"] {\n  color: #6c757d;\n  font-style: italic;\n}\n.field-select:focus {\n  outline: none;\n  border-color: #0066cc;\n}\n\n.cancel-btn {\n  position: absolute;\n  top: 11px;\n  right: 11px;\n  width: 20px;\n  background: none;\n  border: none;\n  color: #adb5bd;\n  cursor: pointer;\n  padding: 4px;\n  font-size: 16px;\n  line-height: 1;\n  border-radius: 4px;\n}\n.cancel-btn:hover {\n  color: #495057;\n  background-color: #f8f9fa;\n}\n\n.field-content {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  width: 100%;\n}\n\n.field-controls {\n  display: flex;\n  gap: 4px;\n  align-items: center;\n}\n\nselect {\n  font-size: 12px;\n  padding: 2px 4px;\n  border: 1px solid var(--st-color-neutral);\n  border-radius: 3px;\n  background: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n  color: var(--st-text-1);\n}\nselect.sort-select {\n  width: 110px;\n}\nselect.order-select {\n  width: 90px;\n}\n\n.field-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  margin-bottom: 12px;\n}\n.field-header .field-name {\n  /* font-size: 16px;\n  font-weight: 500; */\n}\n\n.filter-type-selector {\n  display: flex;\n  padding: 2px;\n  border-radius: 6px;\n  border: 1px solid var(--st-color-neutral);\n  margin-bottom: 12px;\n}\n\n.filter-type-btn {\n  flex: 1;\n  padding: 2px 5px;\n  font-size: 14px;\n  border: none;\n  background: transparent;\n  cursor: pointer;\n  border-radius: 4px;\n  color: var(--st-text-2);\n  transition: all 0.2s ease;\n}\n.filter-type-btn.active {\n  background: color-mix(in srgb, var(--st-text-1) 15%, transparent);\n  color: var(--st-text-1);\n  font-weight: 500;\n}\n.filter-type-btn:hover:not(.active) {\n  background: color-mix(in srgb, var(--st-text-1) 8%, transparent);\n}\n\n.values-filter {\n  /* background: #fff; */\n  border: 1px solid var(--st-color-neutral);\n  border-radius: 6px;\n  overflow: hidden;\n}\n\n.values-list {\n  max-height: 300px;\n  overflow-y: auto;\n}\n\n.values-list-header {\n  position: sticky;\n  top: 0;\n  background: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n  border-bottom: 1px solid var(--st-color-neutral);\n  padding: 12px;\n  z-index: 1;\n}\n\n.search-container {\n  margin-bottom: 12px;\n}\n\n.values-search {\n  width: 100%;\n  padding: 8px 12px;\n  border: 1px solid #ddd;\n  border-radius: 6px;\n  font-size: 14px;\n  background: #f8f8f8;\n}\n.values-search:focus {\n  outline: none;\n  border-color: #0066cc;\n  background: #fff;\n}\n.values-search::placeholder {\n  color: #999;\n}\n\n.values-actions {\n  display: flex;\n  gap: 8px;\n}\n\n.action-btn {\n  flex: 1;\n  padding: 2px 6px;\n  font-size: 14px;\n  border: 1px solid var(--st-color-neutral);\n  border-radius: 6px;\n  background: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n  cursor: pointer;\n  color: var(--st-text-1);\n  transition: all 0.2s ease;\n}\n.action-btn:hover {\n  background: color-mix(in srgb, var(--st-text-1) 15%, transparent);\n}\n\n.values-options {\n  padding: 8px 12px;\n}\n\n.value-option {\n  display: flex;\n  align-items: center;\n  padding: 2px 2px;\n  cursor: pointer;\n  border-radius: 4px;\n  transition: background-color 0.2s ease;\n}\n.value-option:hover {\n  background: color-mix(in srgb, var(--st-text-1) 15%, transparent);\n}\n\n.checkbox-wrapper {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 20px;\n  height: 20px;\n  margin-right: 12px;\n}\n.checkbox-wrapper input[type=checkbox] {\n  width: 16px;\n  height: 16px;\n  margin: 0;\n  cursor: pointer;\n}\n\n.value-label {\n  flex: 1;\n  font-size: 14px;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.values-list::-webkit-scrollbar {\n  width: 8px;\n}\n.values-list::-webkit-scrollbar-track {\n  background: #f1f1f1;\n  border-radius: 4px;\n}\n.values-list::-webkit-scrollbar-thumb {\n  background: #ccc;\n  border-radius: 4px;\n}\n.values-list::-webkit-scrollbar-thumb:hover {\n  background: #bbb;\n}\n\n.condition-filter select, .condition-filter input {\n  width: 100%;\n  /* padding: 8px 12px; */\n  /* border: 1px solid #ddd; */\n  border-radius: 6px;\n  font-size: 14px;\n  margin-bottom: 8px;\n  /* background: #fff; */\n  box-sizing: border-box;\n}\n.condition-filter select:focus, .condition-filter input:focus {\n  outline: none;\n  border-color: #0066cc;\n}\n.condition-filter input {\n  padding: 6px 10px;\n}\n\n.remove-btn {\n  position: absolute;\n  top: 2px;\n  right: 2px;\n  background: none;\n  border: none;\n  color: #999;\n  font-size: 18px;\n  cursor: pointer;\n  padding: 4px 8px;\n  border-radius: 4px;\n}\n.remove-btn:hover {\n  color: #666;\n  background: #f0f0f0;\n}\n\n.formula-input-container {\n  margin-top: 8px;\n  width: 100%;\n}\n\n.formula-input {\n  width: 100%;\n  padding: 8px;\n  border: 1px solid #ddd;\n  border-radius: 4px;\n  font-size: 13px;\n}\n.formula-input:focus {\n  outline: none;\n  border-color: #0066cc;\n}\n.formula-input.error {\n  border-color: #dc3545;\n  background-color: #fff3f3;\n}\n\n.formula-error {\n  color: #dc3545;\n  font-size: 12px;\n  margin-top: 4px;\n  padding: 4px;\n  background-color: #fff3f3;\n  border-radius: 4px;\n}\n\n.actions-panel {\n  position: sticky;\n  bottom: 0;\n  left: 0;\n  right: 0;\n  padding: 12px;\n  background: var(--st-dashboard-bg-0);\n  border-top: 1px solid var(--st-color-neutral);\n  display: flex;\n  justify-content: center;\n  margin: 0 -6px -6px -6px;\n  border-radius: 0 0 8px 8px;\n  flex-shrink: 0;\n  z-index: 10;\n}\n.actions-panel .export-btn {\n  width: 100%;\n  padding: 8px;\n  background: var(--st-dashboard-bg-2);\n  border: 1px solid var(--st-color-neutral);\n  border-radius: 4px;\n  color: var(--st-text-1);\n  cursor: pointer;\n  font-size: 13px;\n  font-weight: 500;\n}\n.actions-panel .export-btn:hover {\n  background: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n}\n\n/*# sourceMappingURL=st-pivottable-controls.vue.map */"]}, media: undefined });

    };
    /* scoped */
    const __vue_scope_id__$2 = "data-v-17677349";
    /* module identifier */
    const __vue_module_identifier__$2 = undefined;
    /* functional template */
    const __vue_is_functional_template__$2 = false;
    /* style inject SSR */
    
    /* style inject shadow dom */
    

    
    const __vue_component__$2 = /*#__PURE__*/normalizeComponent(
      { render: __vue_render__$2, staticRenderFns: __vue_staticRenderFns__$2 },
      __vue_inject_styles__$2,
      __vue_script__$2,
      __vue_scope_id__$2,
      __vue_is_functional_template__$2,
      __vue_module_identifier__$2,
      false,
      createInjector,
      undefined,
      undefined
    );

  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //

  var script$1 = {
      name: 'recursive-pivot-rows',
      props: {
          row: {
              type: Object,
              required: true
          },
          config: {
              type: Object,
              required: true
          },
          expandedRows: {
              type: Array,
              required: true
          }
      },
      methods: {
          isExpanded(rowId) {
              return this.expandedRows.includes(rowId);
          },
          formatValue(value) {
              return typeof value === 'number' ? value.toLocaleString() : value;
          },
          isDrillableCell(cell) {
              return cell && typeof cell.value === 'number';
          }
      }
  };

  /* script */
  const __vue_script__$1 = script$1;

  /* template */
  var __vue_render__$1 = function () {
    var _vm = this;
    var _h = _vm.$createElement;
    var _c = _vm._self._c || _h;
    return _c(
      "tr",
      { class: { expanded: _vm.isExpanded(_vm.row.id) } },
      [
        _vm.config.rows.length
          ? _c("td", { staticClass: "row-label" }, [
              _c(
                "div",
                {
                  staticClass: "row-content",
                  style: { paddingLeft: _vm.row.depth * 20 + "px" },
                },
                [
                  _vm.row.hasChildren
                    ? _c(
                        "button",
                        {
                          staticClass: "expand-btn",
                          on: {
                            click: function ($event) {
                              $event.stopPropagation();
                              return _vm.$emit("toggle-expand", _vm.row.id)
                            },
                          },
                        },
                        [
                          _vm._v(
                            "\n                " +
                              _vm._s(_vm.isExpanded(_vm.row.id) ? "▼" : "▶") +
                              "\n            "
                          ),
                        ]
                      )
                    : _vm._e(),
                  _vm._v(" "),
                  _c("span", [_vm._v(_vm._s(_vm.row.label))]),
                ]
              ),
            ])
          : _vm._e(),
        _vm._v(" "),
        _vm._l(_vm.row.cells, function (cell) {
          return _c(
            "td",
            {
              key: cell.id,
              class: {
                "value-cell": true,
                drillable: _vm.isDrillableCell(cell),
              },
              on: {
                click: function ($event) {
                  return _vm.$emit("cell-click", cell, _vm.row)
                },
              },
            },
            [
              _vm._v(
                "\n        " + _vm._s(_vm.formatValue(cell.value)) + "\n    "
              ),
            ]
          )
        }),
      ],
      2
    )
  };
  var __vue_staticRenderFns__$1 = [];
  __vue_render__$1._withStripped = true;

    /* style */
    const __vue_inject_styles__$1 = function (inject) {
      if (!inject) return
      inject("data-v-520b81ca_0", { source: "\n.row-label[data-v-520b81ca] {\n    white-space: nowrap;\n    cursor: pointer;\n}\n.row-label[data-v-520b81ca]:hover {\n    background-color: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n}\n.row-content[data-v-520b81ca] {\n    display: flex;\n    align-items: center;\n    gap: 4px;\n}\n.expand-btn[data-v-520b81ca] {\n    background: none;\n    border: none;\n    cursor: pointer;\n    padding: 0;\n    font-size: 12px;\n    color: #666;\n    width: 20px;\n    height: 20px;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n}\n.expand-btn[data-v-520b81ca]:hover {\n    background: #eee;\n    border-radius: 3px;\n}\n.value-cell.drillable[data-v-520b81ca] {\n    cursor: pointer;\n    position: relative;\n    text-align: right;\n    padding: 3px 6px;\n}\n.value-cell.drillable[data-v-520b81ca]:hover {\n    background-color: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n}\n.value-cell.drillable[data-v-520b81ca]:hover::after {\n    content: '🔍';\n    position: absolute;\n    top: 2px;\n    right: 2px;\n    font-size: 10px;\n}\ntr.expanded > td[data-v-520b81ca] {\n    background-color: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n}\n", map: {"version":3,"sources":["/Users/daniel/Documents/work/stipple_app/pivot-table/lib/src/components/recursive-pivot-rows.vue"],"names":[],"mappings":";AA4DA;IACA,mBAAA;IACA,eAAA;AACA;AAEA;IACA,sEAAA;AACA;AAEA;IACA,aAAA;IACA,mBAAA;IACA,QAAA;AACA;AAEA;IACA,gBAAA;IACA,YAAA;IACA,eAAA;IACA,UAAA;IACA,eAAA;IACA,WAAA;IACA,WAAA;IACA,YAAA;IACA,aAAA;IACA,mBAAA;IACA,uBAAA;AACA;AAEA;IACA,gBAAA;IACA,kBAAA;AACA;AAEA;IACA,eAAA;IACA,kBAAA;IACA,iBAAA;IACA,gBAAA;AACA;AAEA;IACA,sEAAA;AACA;AAEA;IACA,aAAA;IACA,kBAAA;IACA,QAAA;IACA,UAAA;IACA,eAAA;AACA;AAEA;IACA,sEAAA;AACA","file":"recursive-pivot-rows.vue","sourcesContent":["<template>\n    <tr :class=\"{ 'expanded': isExpanded(row.id) }\">\n        <td v-if=\"config.rows.length\" class=\"row-label\">\n            <div :style=\"{ paddingLeft: `${row.depth * 20}px` }\" class=\"row-content\">\n                <button \n                    v-if=\"row.hasChildren\" \n                    class=\"expand-btn\"\n                    @click.stop=\"$emit('toggle-expand', row.id)\"\n                >\n                    {{ isExpanded(row.id) ? '▼' : '▶' }}\n                </button>\n                <span>{{ row.label }}</span>\n            </div>\n        </td>\n        <td \n            v-for=\"cell in row.cells\" \n            :key=\"cell.id\"\n            :class=\"{\n                'value-cell': true,\n                'drillable': isDrillableCell(cell)\n            }\"\n            @click=\"$emit('cell-click', cell, row)\"\n        >\n            {{ formatValue(cell.value) }}\n        </td>\n    </tr>\n</template>\n\n<script>\nexport default {\n    name: 'recursive-pivot-rows',\n    props: {\n        row: {\n            type: Object,\n            required: true\n        },\n        config: {\n            type: Object,\n            required: true\n        },\n        expandedRows: {\n            type: Array,\n            required: true\n        }\n    },\n    methods: {\n        isExpanded(rowId) {\n            return this.expandedRows.includes(rowId);\n        },\n        formatValue(value) {\n            return typeof value === 'number' ? value.toLocaleString() : value;\n        },\n        isDrillableCell(cell) {\n            return cell && typeof cell.value === 'number';\n        }\n    }\n}\n</script>\n\n<style scoped>\n.row-label {\n    white-space: nowrap;\n    cursor: pointer;\n}\n\n.row-label:hover {\n    background-color: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n}\n\n.row-content {\n    display: flex;\n    align-items: center;\n    gap: 4px;\n}\n\n.expand-btn {\n    background: none;\n    border: none;\n    cursor: pointer;\n    padding: 0;\n    font-size: 12px;\n    color: #666;\n    width: 20px;\n    height: 20px;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n}\n\n.expand-btn:hover {\n    background: #eee;\n    border-radius: 3px;\n}\n\n.value-cell.drillable {\n    cursor: pointer;\n    position: relative;\n    text-align: right;\n    padding: 3px 6px;\n}\n\n.value-cell.drillable:hover {\n    background-color: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n}\n\n.value-cell.drillable:hover::after {\n    content: '🔍';\n    position: absolute;\n    top: 2px;\n    right: 2px;\n    font-size: 10px;\n}\n\ntr.expanded > td {\n    background-color: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n}\n</style> "]}, media: undefined });

    };
    /* scoped */
    const __vue_scope_id__$1 = "data-v-520b81ca";
    /* module identifier */
    const __vue_module_identifier__$1 = undefined;
    /* functional template */
    const __vue_is_functional_template__$1 = false;
    /* style inject SSR */
    
    /* style inject shadow dom */
    

    
    const __vue_component__$1 = /*#__PURE__*/normalizeComponent(
      { render: __vue_render__$1, staticRenderFns: __vue_staticRenderFns__$1 },
      __vue_inject_styles__$1,
      __vue_script__$1,
      __vue_scope_id__$1,
      __vue_is_functional_template__$1,
      __vue_module_identifier__$1,
      false,
      createInjector,
      undefined,
      undefined
    );

  //

  var script = {
      name: 'st-pivottable',
      components: {
          DrillThroughModal: __vue_component__$3,
          StPivottableControls: __vue_component__$2,
          RecursivePivotRows: __vue_component__$1
      },
      
      props: {
          data: {
              type: [Array, Object],
              required: true,
              validator: function(value) {
                  if (Array.isArray(value)) {
                      // For array format, each item must be an object
                      return value.every(item => typeof item === 'object' && item !== null);
                  } else if (typeof value === 'object' && value !== null) {
                      // For column-based format, each property must be an array of the same length
                      const lengths = Object.values(value).map(arr => Array.isArray(arr) ? arr.length : -1);
                      return lengths.length > 0 && lengths.every(len => len === lengths[0] && len >= 0);
                  }
                  return false;
              }
          },
          rows: {
              type: Array,
              default: () => [],
              validator: (value) => value.every(item => {
                  const hasField = typeof item === 'object' && typeof item.field === 'string';
                  const hasValidLabel = !item.label || typeof item.label === 'string';
                  return hasField && hasValidLabel;
              })
          },
          columns: {
              type: Array,
              default: () => [],
              validator: (value) => value.every(item => {
                  const hasField = typeof item === 'object' && typeof item.field === 'string';
                  const hasValidLabel = !item.label || typeof item.label === 'string';
                  return hasField && hasValidLabel;
              })
          },
          values: {
              type: Array,
              default: () => [],
              validator: (value) => value.every(item => {
                  const hasField = typeof item === 'object' && typeof item.field === 'string';
                  const hasValidLabel = !item.label || typeof item.label === 'string';
                  const hasAggregation = typeof item.aggregation === 'string';
                  return hasField && hasValidLabel && hasAggregation;
              })
          },
          filters: {
              type: Array,
              default: () => [],
              validator: (value) => value.every(item => {
                  const typeOfItem = typeof item;
                  const typeOfField = typeof item.field;    
                  const typeOfFilterType = typeof item.filterType;

                  let isValid = true;

                  if( typeOfItem !== 'object' ){
                      isValid = false;
                      console.log( "filter_validation:typeOfItem: ", typeOfItem );
                  }
                  if( typeOfField !== 'string' ) {
                      isValid = false;
                      console.log( "filter_validation:typeOfField: ", typeOfField );
                  }
                  if( typeOfFilterType !== 'string' ) {
                      isValid = false;
                      console.log( "filter_validation:typeOfFilterType: ", typeOfFilterType );
                  }

                  if( isValid ) {
                      if( item.filterType === 'condition' ) {
                          if( typeof item.condition !== 'string' ) {
                              isValid = false;
                              console.log( "filter_validation:typeOfCondition: ", typeof item.condition, item.condition );
                          }else if( item.value === undefined ) {
                              isValid = false;
                              console.log( "filter_validation:value: ", item.value );
                          }
                      }else if( item.filterType === 'values' ) {
                          if( !Array.isArray(item.selectedValues) ) {
                              isValid = false;
                              console.log( "filter_validation:selectedValues: ", Array.isArray(item.selectedValues), item.selectedValues );
                          }
                      }
                  }

                  return isValid;
              })
          }
      },

      data() {
          const normalizedData = this.normalizeData(this.data);
          return {
              config: {
                  rows: (this.rows || []).map(row => ({
                      ...row,
                      sortBy: row.sortBy || 'label',
                      sortOrder: row.sortOrder || 'asc'
                  })),
                  columns: (this.columns || []).map(col => ({
                      ...col,
                      sortBy: col.sortBy || 'label',
                      sortOrder: col.sortOrder || 'asc'
                  })),
                  values: this.values || []
              },
              isDragging: false,
              isLoading: false,
              expandedRowsArray: [],
              sortConfig: {
                  column: null,
                  direction: 'asc'
              },
              pivotData: {
                  headers: [],
                  rows: [],
                  totals: null
              },
              drillThroughData: null,
              drillThroughColumns: [],
              drillThroughTitle: '',
              filteredData: [],
              rowBasedData: normalizedData,
              internalFilters: [...(this.filters || [])],
              filterTypes: {
                  condition: 'Filter by Condition',
                  values: 'Filter by Values'
              },
              uniqueValuesCache: {},
              renderStartTime: performance.now(),
              filterResults: {}
          }
      },

      computed: {
          flattenedRows() {
              const flattened = [];
              console.log('Computing flattenedRows. Current expandedRowsArray:', this.expandedRowsArray);
              
              const addRow = (row, parentVisible = true) => {
                  console.log('Processing row:', {
                      id: row.id,
                      label: row.label,
                      depth: row.depth,
                      hasChildren: row.hasChildren,
                      parentVisible,
                      isExpanded: this.isExpanded(row.id)
                  });
                  
                  // A row is visible if its parent is visible
                  const isVisible = parentVisible;
                  
                  if (isVisible) {
                      flattened.push(row);
                      console.log('Added row to flattened array:', row.label);
                  }
                  
                  // Only process children if this row is expanded
                  if (row.hasChildren && this.isExpanded(row.id)) {
                      console.log('Processing children of row:', row.label);
                      row.children.forEach(child => {
                          // Child rows are only visible if parent is visible and expanded
                          addRow(child, isVisible);
                      });
                  }
              };
              
              // Process top-level rows
              console.log('Processing top-level rows:', this.pivotData.rows.length);
              this.pivotData.rows.forEach(row => {
                  addRow(row, true);
              });
              
              console.log('Final flattened rows:', flattened.map(r => ({ id: r.id, label: r.label, depth: r.depth })));
              return flattened;
          },

          hasNoResults() {
              return this.filteredData && this.filteredData.length === 0;
          },

          getUniqueValues() {
              return (column) => {
                  if (!this.uniqueValuesCache[column]) {
                      const values = new Set();
                      this.filteredData.forEach(row => {
                          if (row[column] !== null && row[column] !== undefined) {
                              values.add(row[column]);
                          }
                      });
                      this.uniqueValuesCache[column] = Array.from(values).sort((a, b) => {
                          return String(a).localeCompare(String(b));
                      });
                  }
                  return this.uniqueValuesCache[column];
              };
          },

          duplicateFields() {
              const rowFields = this.config.rows.map(r => r.field);
              const columnFields = this.config.columns.map(c => c.field);
              return rowFields.filter(field => columnFields.includes(field));
          },
          
          hasDuplicateFields() {
              return this.duplicateFields.length > 0;
          }
      },

      methods: {
          getFieldDisplayName(fieldConfig) {
              return fieldConfig.label || fieldConfig.field;
          },

          normalizeData(data) {
              if (Array.isArray(data)) {
                  return data;
              }

              // Convert column-based format to row-based format
              if (typeof data === 'object' && data !== null) {
                  const columns = Object.keys(data);
                  const rowCount = data[columns[0]].length;
                  const rows = [];

                  for (let i = 0; i < rowCount; i++) {
                      const row = {};
                      columns.forEach(col => {
                          row[col] = data[col][i];
                      });
                      rows.push(row);
                  }

                  return rows;
              }

              return [];
          },


          async applyFilters() {
              this.isLoading = true;
              console.log('[PV]: applyFilters() start - isLoading: ', this.isLoading);
              setTimeout(() => {
                  try {
                      console.log('st-pivottable: applyFilters: ', this.internalFilters);
                      if (!this.rowBasedData) {
                          return;
                      }
                      if (!this.rowBasedData || !this.rowBasedData.length) {
                          return;
                      }

                      // Reset filter results
                      this.filterResults = {};

                      // Test each filter individually first
                      this.internalFilters.forEach(filter => {
                          const filteredCount = this.rowBasedData.filter(row => {
                              const value = row[filter.field];
                              
                              if (filter.filterType === 'values') {
                                  return filter.selectedValues.length === 0 || filter.selectedValues.includes(value);
                              }

                              const filterValue = filter.value;
                              let result;

                              switch (filter.condition) {
                                  case 'equals':
                                      result = value == filterValue;
                                      break;
                                  case 'notEquals':
                                      result = value != filterValue;
                                      break;
                                  case 'greaterThan':
                                      result = value > filterValue;
                                      break;
                                  case 'greaterThanOrEqual':
                                      result = value >= filterValue;
                                      break;
                                  case 'lessThan':
                                      result = value < filterValue;
                                      break;
                                  case 'lessThanOrEqual':
                                      result = value <= filterValue;
                                      break;
                                  case 'contains':
                                      result = String(value).toLowerCase().includes(String(filterValue).toLowerCase());
                                      break;
                                  case 'notContains':
                                      result = !String(value).toLowerCase().includes(String(filterValue).toLowerCase());
                                      break;
                                  case 'startsWith':
                                      result = String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
                                      break;
                                  case 'endsWith':
                                      result = String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
                                      break;
                                  case 'isEmpty':
                                      result = value === null || value === undefined || value === '';
                                      break;
                                  case 'isNotEmpty':
                                      result = value !== null && value !== undefined && value !== '';
                                      break;
                                  default:
                                      result = true;
                              }
                              return result;
                          }).length;

                          this.filterResults[filter.field] = filteredCount > 0;
                      });

                      // Now apply all filters together as before
                      this.filteredData = this.rowBasedData.filter(row => {
                          return this.internalFilters.every(filter => {
                              const value = row[filter.field];

                              if (filter.filterType === 'values') {
                                  return filter.selectedValues.length === 0 || filter.selectedValues.includes(value);
                              }

                              const filterValue = filter.value;
                              let result;

                              switch (filter.condition) {
                                  case 'equals':
                                      result = value == filterValue;
                                      break;
                                  case 'notEquals':
                                      result = value != filterValue;
                                      break;
                                  case 'greaterThan':
                                      result = value > filterValue;
                                      break;
                                  case 'greaterThanOrEqual':
                                      result = value >= filterValue;
                                      break;
                                  case 'lessThan':
                                      result = value < filterValue;
                                      break;
                                  case 'lessThanOrEqual':
                                      result = value <= filterValue;
                                      break;
                                  case 'contains':
                                      result = String(value).toLowerCase().includes(String(filterValue).toLowerCase());
                                      break;
                                  case 'notContains':
                                      result = !String(value).toLowerCase().includes(String(filterValue).toLowerCase());
                                      break;
                                  case 'startsWith':
                                      result = String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
                                      break;
                                  case 'endsWith':
                                      result = String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
                                      break;
                                  case 'isEmpty':
                                      result = value === null || value === undefined || value === '';
                                      break;
                                  case 'isNotEmpty':
                                      result = value !== null && value !== undefined && value !== '';
                                      break;
                                  default:
                                      result = true;
                              }
                              return result;
                          });
                      });

                      console.log('Filtered data length:', this.filteredData.length);
                      
                      if (this.filteredData && this.filteredData.length) {
                          const processor = new PivotProcessor(this.filteredData, this.config);
                          this.pivotData = processor.process(this.sortConfig);
                      }
                  } finally {
                      this.isLoading = false;
                      console.log('[PV]: applyFilters() end - isLoading: ', this.isLoading);
                  }
              }, 1);
          },

          async updatePivotData() {
              this.isLoading = true;
              setTimeout(() => {
                  try {
                      if (this.filteredData && this.filteredData.length) {
                          const processor = new PivotProcessor(this.filteredData, this.config);
                          this.pivotData = processor.process(this.sortConfig);
                      } else {
                          // Create an empty pivot data structure that maintains headers
                          this.pivotData = {
                              headers: this.generateEmptyHeaders(),
                              rows: [],
                              totals: {
                                  cells: this.config.values.map(value => ({
                                      id: `total_${value.field}_${value.aggregation}`,
                                      value: 0
                                  }))
                              }
                          };
                      }
                  } finally {
                      this.isLoading = false;
                  }
              }, 1);
          },

          generateEmptyHeaders() {
              const headers = [];
              
              // If we have column fields, create header structure
              if (this.config.columns.length) {
                  // Add empty header rows for each column field
                  this.config.columns.forEach((col, index) => {
                      headers.push([{
                          id: `empty_header_${index}`,
                          label: '',
                          colspan: 1,
                          depth: index
                      }]);
                  });
              } else if (this.config.values.length) {
                  // If no column fields but we have values, add single header row
                  headers.push([{
                      id: 'empty_value_header',
                      label: this.getFieldDisplayName(this.config.values[0]),
                      colspan: 1,
                      depth: 0
                  }]);
              }
              
              return headers;
          },

          onConfigChanged(newConfig) {
              this.config = newConfig;
              this.updatePivotData();
          },
          
          onFiltersChanged(newFilters) {
              console.log( 'onFiltersChanged', newFilters );
              this.internalFilters = newFilters;
              this.applyFilters();
          },

          toggleSort(header) {
              if (this.sortConfig.column === header.id) {
                  this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
              } else {
                  this.sortConfig.column = header.id;
                  this.sortConfig.direction = 'asc';
              }
              this.updatePivotData();
          },

          formatValue(value) {
              return typeof value === 'number' ? value.toLocaleString() : value;
          },

          isExpanded(rowId) {
              const expanded = this.expandedRowsArray.includes(rowId);
              console.log('Checking expansion state:', { rowId, expanded });
              return expanded;
          },

          toggleExpand(rowId) {
              console.log('Toggling expansion for row:', rowId);
              console.log('Current expandedRowsArray:', [...this.expandedRowsArray]);
              
              const index = this.expandedRowsArray.indexOf(rowId);
              if (index > -1) {
                  console.log('Collapsing row:', rowId);
                  // When collapsing a row, also collapse all its descendants
                  const rowToCollapse = this.findRowById(rowId, this.pivotData.rows);
                  console.log('Found row to collapse:', rowToCollapse);
                  
                  if (rowToCollapse) {
                      const descendantIds = this.getDescendantIds(rowToCollapse);
                      console.log('Descendant IDs to collapse:', descendantIds);
                      
                      this.expandedRowsArray = this.expandedRowsArray.filter(id => 
                          id !== rowId && !descendantIds.includes(id)
                      );
                  } else {
                      console.log('Row not found, simple removal');
                      this.expandedRowsArray.splice(index, 1);
                  }
              } else {
                  console.log('Expanding row:', rowId);
                  this.expandedRowsArray.push(rowId);
              }
              console.log('New expandedRowsArray:', [...this.expandedRowsArray]);
          },

          findRowById(id, rows) {
              console.log('Finding row by ID:', id);
              for (const row of rows) {
                  if (row.id === id) {
                      console.log('Found row:', row);
                      return row;
                  }
                  if (row.children) {
                      const found = this.findRowById(id, row.children);
                      if (found) return found;
                  }
              }
              return null;
          },

          getDescendantIds(row) {
              console.log('Getting descendant IDs for row:', row.label);
              const ids = [];
              if (row.children) {
                  row.children.forEach(child => {
                      ids.push(child.id);
                      ids.push(...this.getDescendantIds(child));
                  });
              }
              console.log('Found descendant IDs:', ids);
              return ids;
          },

          isDrillableCell(cell) {
              // For now, consider all value cells as drillable
              // Later we can add more specific conditions
              return cell && typeof cell.value === 'number';
          },

          onCellClick(cell, row) {
              if (!this.isDrillableCell(cell)) return;
              
              // Get the column configuration from the cell's position
              const columnIndex = row.cells.indexOf(cell);
              console.log('Column index:', columnIndex);
              console.log('Row:', row);
              
              // Get all header levels for this column
              const headerLevels = [];
              for (let level = 0; level < this.pivotData.headers.length; level++) {
                  const headerRow = this.pivotData.headers[level];
                  let currentIndex = 0;
                  for (const header of headerRow) {
                      if (currentIndex <= columnIndex && currentIndex + header.colspan > columnIndex) {
                          headerLevels.push(header);
                          break;
                      }
                      currentIndex += header.colspan;
                  }
              }
              console.log('Header levels:', headerLevels);
              
              // Build filters based on row path and column path
              const filters = {};
              
              // Collect all row values up the hierarchy
              const rowValues = [];
              let currentRow = row;
              while (currentRow && currentRow.label) {
                  rowValues.unshift({
                      label: currentRow.label,
                      depth: currentRow.depth
                  });
                  currentRow = currentRow.parent;
              }
              console.log('Row hierarchy:', rowValues);
              
              // Map row values to fields based on depth
              this.config.rows.forEach((rowField, index) => {
                  const rowValue = rowValues.find(rv => rv.depth === index);
                  if (rowValue) {
                      filters[rowField.field] = rowValue.label;
                      console.log(`Adding row filter: ${rowField.field} = ${rowValue.label}`);
                  }
              });
              
              // Add column dimension filters by mapping header levels to column fields
              this.config.columns.forEach((colField, index) => {
                  const headerLevel = headerLevels[index];
                  if (headerLevel && headerLevel.label) {
                      filters[colField.field] = headerLevel.label;
                      console.log(`Adding column filter: ${colField.field} = ${headerLevel.label}`);
                  }
              });
              
              console.log('Applied filters:', filters);
              
              // Filter the source data
              const filteredData = this.filteredData.filter(record => {
                  const matches = Object.entries(filters).every(([field, value]) => {
                      const match = record[field] === value;
                      return match;
                  });
                  return matches;
              });
              
              console.log(`Found ${filteredData.length} matching records out of ${this.filteredData.length} total`);
              
              // Update modal data
              const rowPath = rowValues.map(r => r.label).join(' / ');
              const columnPath = headerLevels.map(h => h.label).join(' / ');
              this.drillThroughTitle = `Drill Through - ${rowPath} (${columnPath})`;
              this.drillThroughColumns = Object.keys(this.filteredData[0]);
              this.drillThroughData = filteredData;
          },

          closeDrillThrough() {
              this.drillThroughData = null;
              this.drillThroughColumns = [];
              this.drillThroughTitle = '';
          },

          addNewFilter() {
              if (this.selectedColumn) {
                  const newFilter = {
                      column: this.selectedColumn,
                      filterType: 'condition', // Default to condition for backward compatibility
                      condition: this.getDefaultCondition(this.selectedColumn),
                      value: '',
                      selectedValues: [] // For values filter type
                  };
                  this.internalFilters.push(newFilter);
                  this.selectedColumn = null;
                  this.showColumnSelect = false;
                  console.log( 'addNewFilter: ', this.internalFilters );
                  this.$emit('filtersChanged', this.internalFilters);
              }
          },

          toggleFilterType(filter) {
              filter.filterType = filter.filterType === 'condition' ? 'values' : 'condition';
              if (filter.filterType === 'values') {
                  filter.selectedValues = [];
              } else {
                  filter.condition = this.getDefaultCondition(filter.column);
                  filter.value = '';
              }
              this.filterChanged();
          },

          selectAllValues(filter) {
              filter.selectedValues = [...this.getUniqueValues(filter.column)];
              this.filterChanged();
          },

          clearValues(filter) {
              filter.selectedValues = [];
              this.filterChanged();
          },

          filteredValues(filter) {
              const values = this.getUniqueValues(filter.column);
              if (!filter.searchQuery) return values;
              
              const searchTerm = filter.searchQuery.toLowerCase();
              return values.filter(value => 
                  String(value).toLowerCase().includes(searchTerm)
              );
          },

          exportToCsv() {
              // Get all header rows
              const headerRows = this.pivotData.headers.map((headerRow, rowIndex) => {
                  // For each header row, create an array with row field names or empty cells
                  const rowFieldCells = rowIndex === 0 
                      ? this.config.rows.map(r => r.field)  // First row gets the field names
                      : Array(this.config.rows.length).fill(''); // Other rows get empty cells
                  
                  // For each header in this row, repeat the label based on its colspan
                  const headerCells = [];
                  headerRow.forEach(header => {
                      // Repeat the header label for its colspan
                      for (let i = 0; i < header.colspan; i++) {
                          headerCells.push(header.label);
                      }
                  });
                  
                  return [...rowFieldCells, ...headerCells];
              });
              
              // Process rows recursively, including row headers and values
              const processRow = (row, parentIndent = '') => {
                  const rowData = [];
                  
                  // Add row headers with proper indentation
                  const indent = parentIndent + (row.depth > 0 ? '  ' : '');
                  const rowHeaders = Array(this.config.rows.length).fill('');
                  rowHeaders[row.depth] = indent + row.label;
                  
                  // Add cell values
                  const values = row.cells.map(cell => this.formatValue(cell.value));
                  
                  rowData.push([...rowHeaders, ...values]);
                  
                  // Process children if any
                  if (row.children) {
                      row.children.forEach(child => {
                          rowData.push(...processRow(child, indent));
                      });
                  }
                  
                  return rowData;
              };
              
              // Get all row data
              const rows = this.pivotData.rows.flatMap(row => processRow(row));
              
              // Add totals row if exists
              if (this.pivotData.totals) {
                  const totalRow = [
                      'Total',
                      ...Array(this.config.rows.length - 1).fill(''),
                      ...this.pivotData.totals.cells.map(cell => this.formatValue(cell.value))
                  ];
                  rows.push(totalRow);
              }
              
              // Combine headers and rows
              const csvContent = [
                  ...headerRows,  // Include all header rows
                  ...rows
              ]
                  .map(row => row.map(cell => {
                      // Escape cells containing commas or quotes
                      const cellStr = String(cell);
                      return cellStr.includes(',') || cellStr.includes('"') 
                          ? `"${cellStr.replace(/"/g, '""')}"` 
                          : cellStr;
                  }).join(','))
                  .join('\n');
              
              // Create and trigger download
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              const timestamp = new Date().toISOString().replace(/[:.]/g, '_');
              link.href = URL.createObjectURL(blob);
              link.download = `pivot_table_export_${timestamp}.csv`;
              link.click();
              URL.revokeObjectURL(link.href);
          },
      },

      watch: {
          rows: {
              handler(newRows) {
                  this.config.rows = (newRows || []).map(row => ({
                      ...row,
                      sortBy: row.sortBy || 'label',
                      sortOrder: row.sortOrder || 'asc'
                  }));
                  this.updatePivotData();
              },
              deep: true
          },
          columns: {
              handler(newColumns) {
                  this.config.columns = (newColumns || []).map(col => ({
                      ...col,
                      sortBy: col.sortBy || 'label',
                      sortOrder: col.sortOrder || 'asc'
                  }));
                  this.updatePivotData();
              },
              deep: true
          },
          values: {
              handler(newValues) {
                  this.config.values = newValues;
                  this.updatePivotData();
              },
              deep: true
          },
          data: {
              immediate: true,
              handler(newData) {
                  this.rowBasedData = this.normalizeData(newData);
                  this.applyFilters();
              }
          },
          filters: {
              immediate: true,
              handler(newFilters) {
                  console.log('[PV]: watch.filters.handler: ', newFilters);
                  this.internalFilters = [...(newFilters || [])];
                  if (this.rowBasedData) {
                      this.applyFilters();
                  }
              },
              deep: false
          }
      },

      mounted() {
          this.$nextTick(() => {
              this.applyFilters();
              const renderTime = performance.now() - this.renderStartTime;
              console.log('PivotTable Render Time:', {
                  totalTime: `${Math.round(renderTime)}ms`,
                  rowCount: this.filteredData?.length || 0,
                  dataFormat: Array.isArray(this.data) ? 'row-oriented' : 'column-oriented'
              });
          });
      }
  };

  /* script */
  const __vue_script__ = script;

  /* template */
  var __vue_render__ = function () {
    var _vm = this;
    var _h = _vm.$createElement;
    var _c = _vm._self._c || _h;
    return _c(
      "div",
      { staticClass: "pivot-table", class: { "is-dragging": _vm.isDragging } },
      [
        _c(
          "div",
          { staticClass: "pivot-table-layout" },
          [
            _c("div", { staticClass: "table-container" }, [
              _vm.isLoading
                ? _c("div", { staticClass: "loading-state fade-in" }, [
                    _c("div", { staticClass: "loading-spinner" }),
                    _vm._v(" "),
                    _c("p", [_vm._v("Calculating pivot table results...")]),
                  ])
                : !_vm.hasNoResults &&
                  !_vm.hasDuplicateFields &&
                  _vm.pivotData.rows.length
                ? _c("table", [
                    _c(
                      "thead",
                      _vm._l(
                        _vm.pivotData.headers,
                        function (headerRow, rowIndex) {
                          return _c(
                            "tr",
                            { key: rowIndex },
                            [
                              _vm.config.rows.length && rowIndex === 0
                                ? _c(
                                    "th",
                                    {
                                      staticClass: "row-header",
                                      attrs: {
                                        rowspan: _vm.pivotData.headers.length,
                                      },
                                    },
                                    [
                                      _vm._v(
                                        "\n                      " +
                                          _vm._s(
                                            _vm.config.rows
                                              .map(function (r) {
                                                return _vm.getFieldDisplayName(r)
                                              })
                                              .join(" - ")
                                          ) +
                                          "\n                  "
                                      ),
                                    ]
                                  )
                                : _vm._e(),
                              _vm._v(" "),
                              _vm._l(headerRow, function (header) {
                                return _c(
                                  "th",
                                  {
                                    key: header.id,
                                    staticClass: "column-header",
                                    class: {
                                      "sortable-header":
                                        rowIndex ===
                                        _vm.pivotData.headers.length - 1,
                                      sorted: _vm.sortConfig.column === header.id,
                                      "sorted-asc":
                                        _vm.sortConfig.column === header.id &&
                                        _vm.sortConfig.direction === "asc",
                                      "sorted-desc":
                                        _vm.sortConfig.column === header.id &&
                                        _vm.sortConfig.direction === "desc",
                                    },
                                    attrs: { colspan: header.colspan },
                                    on: {
                                      click: function ($event) {
                                        rowIndex ===
                                          _vm.pivotData.headers.length - 1 &&
                                          _vm.toggleSort(header);
                                      },
                                    },
                                  },
                                  [
                                    _c("div", { staticClass: "header-content" }, [
                                      _c("span", [_vm._v(_vm._s(header.label))]),
                                      _vm._v(" "),
                                      rowIndex ===
                                      _vm.pivotData.headers.length - 1
                                        ? _c("div", {
                                            staticClass: "header-controls",
                                          })
                                        : _vm._e(),
                                    ]),
                                  ]
                                )
                              }),
                            ],
                            2
                          )
                        }
                      ),
                      0
                    ),
                    _vm._v(" "),
                    _c(
                      "tbody",
                      [
                        _vm._l(_vm.flattenedRows, function (row) {
                          return _c("recursive-pivot-rows", {
                            key: row.id,
                            attrs: {
                              row: row,
                              config: _vm.config,
                              "expanded-rows": _vm.expandedRowsArray,
                            },
                            on: {
                              "toggle-expand": _vm.toggleExpand,
                              "cell-click": _vm.onCellClick,
                            },
                          })
                        }),
                        _vm._v(" "),
                        _vm.pivotData.totals
                          ? _c(
                              "tr",
                              { staticClass: "totals-row" },
                              [
                                _vm.config.rows.length
                                  ? _c("td", [_c("strong", [_vm._v("Total")])])
                                  : _vm._e(),
                                _vm._v(" "),
                                _vm._l(
                                  _vm.pivotData.totals.cells,
                                  function (cell) {
                                    return _c("td", { key: cell.id }, [
                                      _c("strong", [
                                        _vm._v(
                                          _vm._s(_vm.formatValue(cell.value))
                                        ),
                                      ]),
                                    ])
                                  }
                                ),
                              ],
                              2
                            )
                          : _vm._e(),
                      ],
                      2
                    ),
                  ])
                : _vm.hasDuplicateFields
                ? _c("div", { staticClass: "no-results error" }, [
                    _c("div", { staticStyle: { "line-height": "1.5rem" } }, [
                      _c("b", [_vm._v("Configuration Error")]),
                      _vm._v(" "),
                      _c("br"),
                      _vm._v(
                        "\n            The following " +
                          _vm._s(
                            _vm.duplicateFields.length > 1 ? "fields" : "field"
                          ) +
                          " cannot be used as both row and column:\n            "
                      ),
                      _c(
                        "ul",
                        _vm._l(_vm.duplicateFields, function (field) {
                          return _c("li", { key: field }, [_vm._v(_vm._s(field))])
                        }),
                        0
                      ),
                      _vm._v(
                        "\n            Please remove " +
                          _vm._s(_vm.duplicateFields.length > 1 ? "them" : "it") +
                          " from either rows or columns.\n        "
                      ),
                    ]),
                  ])
                : _vm.hasNoResults
                ? _c("div", { staticClass: "no-results" }, [
                    _c("p", [_vm._v("No data matches the current filters")]),
                  ])
                : _vm._e(),
            ]),
            _vm._v(" "),
            _c("st-pivottable-controls", {
              attrs: {
                data: _vm.rowBasedData,
                rows: _vm.config.rows,
                columns: _vm.config.columns,
                values: _vm.config.values,
                filters: _vm.internalFilters,
                "has-no-results": _vm.hasNoResults,
                "filter-results": _vm.filterResults,
              },
              on: {
                configChanged: _vm.onConfigChanged,
                filtersChanged: _vm.onFiltersChanged,
                export: _vm.exportToCsv,
              },
            }),
          ],
          1
        ),
        _vm._v(" "),
        _vm.drillThroughData
          ? _c("DrillThroughModal", {
              attrs: {
                data: _vm.drillThroughData,
                columns: _vm.drillThroughColumns,
                title: _vm.drillThroughTitle,
              },
              on: { close: _vm.closeDrillThrough },
            })
          : _vm._e(),
      ],
      1
    )
  };
  var __vue_staticRenderFns__ = [];
  __vue_render__._withStripped = true;

    /* style */
    const __vue_inject_styles__ = function (inject) {
      if (!inject) return
      inject("data-v-0996f7d4_0", { source: "@charset \"UTF-8\";\n.pivot-table[data-v-0996f7d4] {\n  padding: 20px;\n  /* font-family: Inter, Arial, sans-serif; */\n  height: 100%;\n  display: flex;\n  flex-direction: column;\n  box-sizing: border-box;\n}\n.pivot-table-layout[data-v-0996f7d4] {\n  display: flex;\n  gap: 20px;\n  align-items: stretch;\n  flex: 1;\n  min-height: 0;\n}\n.pivot-table-layout .table-container[data-v-0996f7d4] {\n  flex: 1;\n  overflow: auto;\n  min-height: 0;\n  border: solid 1px var(--st-color-neutral);\n  border-radius: 8px;\n  display: flex;\n  flex-direction: column;\n}\n.pivot-table-layout .table-container[data-v-0996f7d4]::-webkit-scrollbar {\n  width: 8px;\n  height: 8px;\n}\n.pivot-table-layout .table-container[data-v-0996f7d4]::-webkit-scrollbar-track {\n  background: transparent;\n}\n.pivot-table-layout .table-container[data-v-0996f7d4]::-webkit-scrollbar-thumb {\n  background: var(--st-color-neutral);\n  border-radius: 4px;\n}\n.pivot-table-layout .table-container[data-v-0996f7d4]::-webkit-scrollbar-thumb:hover {\n  background: color-mix(in srgb, var(--st-color-neutral) 80%, transparent);\n}\n.pivot-table-layout .table-container[data-v-0996f7d4]::-webkit-scrollbar-corner {\n  background: transparent;\n}\n.pivot-table-layout .table-container .table-actions[data-v-0996f7d4] {\n  flex: 0 0 auto;\n  display: flex;\n  justify-content: flex-end;\n  padding: 8px;\n  background: var(--st-dashboard-bg-1);\n  border-bottom: 1px solid var(--st-color-neutral);\n}\n.pivot-table-layout .table-container .table-actions .export-btn[data-v-0996f7d4] {\n  padding: 6px 12px;\n  background: var(--st-dashboard-bg-2);\n  border: 1px solid var(--st-color-neutral);\n  border-radius: 4px;\n  color: var(--st-text-1);\n  cursor: pointer;\n  font-size: 13px;\n}\n.pivot-table-layout .table-container .table-actions .export-btn[data-v-0996f7d4]:hover {\n  background: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n}\n.table-container[data-v-0996f7d4] {\n  flex: 1;\n  overflow: auto;\n  min-height: 0;\n  position: relative;\n}\n.table-container table[data-v-0996f7d4] {\n  border-collapse: collapse;\n  width: 100%;\n}\n.table-container table th[data-v-0996f7d4], .table-container table td[data-v-0996f7d4] {\n  border: 1px solid var(--st-pivottable-col-headers-border);\n  padding: 4px 8px;\n  text-align: right;\n}\n.table-container table th[data-v-0996f7d4]:first-child, .table-container table td[data-v-0996f7d4]:first-child {\n  text-align: left;\n  position: sticky;\n  left: 0;\n}\n.table-container table th[data-v-0996f7d4] {\n  background: #f5f5f5;\n  position: sticky;\n  border-bottom: 1px solid #ddd;\n  height: 37px;\n  box-sizing: border-box;\n}\n.table-container table thead tr:nth-child(1) th[data-v-0996f7d4] {\n  top: 0;\n  z-index: 3;\n}\n.table-container table thead tr:nth-child(1) th[data-v-0996f7d4]:first-child {\n  z-index: 4;\n}\n.table-container table thead tr:nth-child(2) th[data-v-0996f7d4] {\n  top: 37px;\n  z-index: 2;\n}\n.table-container table thead tr:nth-child(3) th[data-v-0996f7d4] {\n  top: 74px;\n  z-index: 1;\n}\n.table-container table thead tr:nth-child(4) th[data-v-0996f7d4] {\n  top: 111px;\n  z-index: 1;\n}\n.table-container table thead tr:nth-child(5) th[data-v-0996f7d4] {\n  top: 148px;\n  z-index: 1;\n}\n.table-container table thead tr:nth-child(6) th[data-v-0996f7d4] {\n  top: 185px;\n  z-index: 1;\n}\n.table-container table tbody td[data-v-0996f7d4]:first-child {\n  z-index: 1;\n}\n.table-container table tr.subtotal-row td[data-v-0996f7d4] {\n  border-top: 2px solid #e9ecef;\n  border-bottom: 1px solid #dee2e6;\n  background: #f8f9fa;\n}\n.table-container table tr.subtotal-row td[data-v-0996f7d4]:first-child {\n  background: #f8f9fa;\n}\n.table-container table tr.total-row td[data-v-0996f7d4] {\n  border-top: 2px solid #dee2e6;\n  padding-top: 12px;\n  padding-bottom: 12px;\n  background: #f1f3f5;\n}\n.table-container table tr.total-row td[data-v-0996f7d4]:first-child {\n  background: #f1f3f5;\n}\n.table-container table tr.total-row:last-child td[data-v-0996f7d4] {\n  border-bottom: 2px solid #dee2e6;\n}\n.field-content[data-v-0996f7d4] {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  flex: 1;\n}\n.field-content select[data-v-0996f7d4] {\n  padding: 2px;\n  border: 1px solid #ddd;\n  border-radius: 3px;\n}\n.sortable-header[data-v-0996f7d4] {\n  cursor: pointer;\n  user-select: none;\n}\n.sortable-header[data-v-0996f7d4]:hover {\n  background: #e9e9e9;\n}\n.sortable-header.sorted[data-v-0996f7d4] {\n  background: #f0f0f0;\n}\n.sort-indicator[data-v-0996f7d4] {\n  margin-left: 4px;\n  font-size: 0.8em;\n}\n.totals-row[data-v-0996f7d4] {\n  border-top: 2px solid var(--st-pivottable-col-headers-border);\n}\n.row-label[data-v-0996f7d4] {\n  white-space: nowrap;\n  cursor: pointer;\n}\n.row-label[data-v-0996f7d4]:hover {\n  background-color: #f5f5f5;\n}\n.row-content[data-v-0996f7d4] {\n  display: flex;\n  align-items: center;\n  gap: 4px;\n}\n.expand-btn[data-v-0996f7d4] {\n  background: none;\n  border: none;\n  cursor: pointer;\n  padding: 0;\n  font-size: 12px;\n  color: #666;\n  width: 20px;\n  height: 20px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n.expand-btn[data-v-0996f7d4]:hover {\n  background: #eee;\n  border-radius: 3px;\n}\n.column-header[data-v-0996f7d4] {\n  background: #f5f5f5;\n  text-align: center !important;\n  border-bottom: 1px solid #ddd;\n}\n.column-header.sortable-header[data-v-0996f7d4] {\n  cursor: pointer;\n  user-select: none;\n}\n.column-header.sortable-header[data-v-0996f7d4]:hover {\n  background: #e9e9e9;\n}\n.column-header.sortable-header.sorted[data-v-0996f7d4] {\n  background: #f0f0f0;\n}\n.row-header[data-v-0996f7d4] {\n  background: #f5f5f5;\n  text-align: left !important;\n  font-weight: bold;\n  border-right: 2px solid #ddd;\n}\ntr.expanded > td[data-v-0996f7d4] {\n  background-color: #fafafa;\n}\n.header-content[data-v-0996f7d4] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n}\n.header-controls[data-v-0996f7d4] {\n  display: flex;\n  align-items: center;\n  gap: 4px;\n}\n.column-header[data-v-0996f7d4] {\n  position: relative;\n}\n.pivot-table.is-dragging .drop-zone.drag-over .field-item[data-v-0996f7d4] {\n  pointer-events: none;\n}\n.value-cell.drillable[data-v-0996f7d4] {\n  cursor: pointer;\n  position: relative;\n}\n.value-cell.drillable[data-v-0996f7d4]:hover {\n  background-color: #f0f7ff;\n}\n.value-cell.drillable[data-v-0996f7d4]:hover::after {\n  content: \"🔍\";\n  position: absolute;\n  top: 2px;\n  right: 2px;\n  font-size: 10px;\n}\n.drill-modal-backdrop[data-v-0996f7d4] {\n  position: fixed;\n  top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  background: rgba(0, 0, 0, 0.5);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n.drill-modal[data-v-0996f7d4] {\n  background: var(--st-dashboard-bg-1);\n  color: var(--st-text-1);\n  border-radius: 8px;\n  width: 90%;\n  max-width: 1200px;\n  max-height: 90vh;\n  display: flex;\n  flex-direction: column;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);\n}\n.drill-modal .drill-modal-header[data-v-0996f7d4] {\n  padding: 16px;\n  border-bottom: 1px solid #eee;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}\n.drill-modal .drill-modal-header h3[data-v-0996f7d4] {\n  margin: 0;\n  font-size: 18px;\n  color: var(--st-text-1);\n}\n.drill-modal .drill-modal-header .close-btn[data-v-0996f7d4] {\n  background: none;\n  border: none;\n  font-size: 24px;\n  cursor: pointer;\n  color: #666;\n}\n.drill-modal .drill-modal-header .close-btn[data-v-0996f7d4]:hover {\n  color: var(--st-text-1);\n}\n.drill-modal .drill-modal-body[data-v-0996f7d4] {\n  padding: 16px;\n  overflow: auto;\n}\n.drill-modal .drill-modal-body table[data-v-0996f7d4] {\n  width: 100%;\n  border-collapse: collapse;\n}\n.drill-modal .drill-modal-body table th[data-v-0996f7d4], .drill-modal .drill-modal-body table td[data-v-0996f7d4] {\n  padding: 8px;\n  border: 1px solid var(--st-pivottable-col-headers-border);\n  text-align: left;\n}\n.drill-modal .drill-modal-body table th[data-v-0996f7d4] {\n  background: var(--st-dashboard-bg-2);\n  font-weight: 600;\n}\n.drill-modal .drill-modal-body table tr[data-v-0996f7d4]:nth-child(even) {\n  background: #f9f9f9;\n}\n.drill-modal .drill-modal-body table tr[data-v-0996f7d4]:hover {\n  background: #f0f7ff;\n}\n.no-results[data-v-0996f7d4] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 200px;\n  font-size: 14px;\n  background: color-mix(in srgb, var(--st-text-1) 15%, transparent);\n  color: var(--st-text-1);\n  border: 1px solid var(--st-color-neutral);\n  padding: 1rem;\n  margin: 1rem;\n  border-radius: 4px;\n}\n.filter-type-toggle[data-v-0996f7d4] {\n  margin: 5px 0;\n}\n.toggle-btn[data-v-0996f7d4] {\n  padding: 4px 8px;\n  border: 1px solid #ddd;\n  background: #f5f5f5;\n  cursor: pointer;\n  border-radius: 4px;\n}\n.toggle-btn.active[data-v-0996f7d4] {\n  background: #e0e0e0;\n  border-color: #ccc;\n}\n.values-filter[data-v-0996f7d4] {\n  margin-top: 8px;\n  border: 1px solid #ddd;\n  border-radius: 4px;\n}\n.values-list[data-v-0996f7d4] {\n  max-height: 200px;\n  overflow-y: auto;\n}\n.values-list-header[data-v-0996f7d4] {\n  padding: 8px;\n  border-bottom: 1px solid #ddd;\n  background: #f5f5f5;\n}\n.values-search[data-v-0996f7d4] {\n  width: 100%;\n  padding: 4px;\n  margin-bottom: 8px;\n}\n.values-actions[data-v-0996f7d4] {\n  display: flex;\n  gap: 8px;\n}\n.values-actions button[data-v-0996f7d4] {\n  padding: 2px 6px;\n  font-size: 12px;\n}\n.values-options[data-v-0996f7d4] {\n  padding: 8px;\n}\n.value-option[data-v-0996f7d4] {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 4px 0;\n  cursor: pointer;\n}\n.value-option[data-v-0996f7d4]:hover {\n  background: #f5f5f5;\n}\n.field-header[data-v-0996f7d4] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  margin-bottom: 8px;\n}\n.field-name[data-v-0996f7d4] {\n  font-weight: 500;\n}\n.value-label[data-v-0996f7d4] {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.values-filter[data-v-0996f7d4] {\n  margin-top: 8px;\n  border: 1px solid #ddd;\n  border-radius: 4px;\n  background: white;\n}\n.values-list[data-v-0996f7d4] {\n  max-height: 200px;\n  overflow-y: auto;\n}\n.values-list-header[data-v-0996f7d4] {\n  position: sticky;\n  top: 0;\n  padding: 8px;\n  border-bottom: 1px solid #ddd;\n  background: #f5f5f5;\n  z-index: 1;\n}\n.values-search[data-v-0996f7d4] {\n  width: 100%;\n  padding: 6px;\n  border: 1px solid #ddd;\n  border-radius: 4px;\n  margin-bottom: 8px;\n}\n.values-actions[data-v-0996f7d4] {\n  display: flex;\n  gap: 8px;\n}\n.values-actions button[data-v-0996f7d4] {\n  padding: 4px 8px;\n  font-size: 12px;\n  border: 1px solid #ddd;\n  border-radius: 4px;\n  background: white;\n  cursor: pointer;\n}\n.values-actions button[data-v-0996f7d4]:hover {\n  background: #f0f0f0;\n}\n.values-options[data-v-0996f7d4] {\n  padding: 8px;\n}\n.value-option[data-v-0996f7d4] {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 6px 8px;\n  cursor: pointer;\n  border-radius: 4px;\n}\n.value-option[data-v-0996f7d4]:hover {\n  background: #f5f5f5;\n}\n.value-option input[type=checkbox][data-v-0996f7d4] {\n  margin: 0;\n}\n.no-results.error[data-v-0996f7d4] {\n  color: #dc3545;\n  background-color: #fff3f3;\n  border: 1px solid #ffcdd2;\n}\n.no-results.error ul[data-v-0996f7d4] {\n  margin: 0.5rem 0;\n  padding-left: 2rem;\n}\n.loading-state[data-v-0996f7d4] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  min-height: 200px;\n  color: var(--st-text-1);\n  background: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n  padding: 2rem;\n  margin: 1rem;\n  border-radius: 8px;\n  gap: 1rem;\n}\n.loading-spinner[data-v-0996f7d4] {\n  width: 40px;\n  height: 40px;\n  border: 3px solid var(--st-color-neutral);\n  border-top-color: var(--st-text-1);\n  border-radius: 50%;\n  animation: spin-data-v-0996f7d4 1s linear infinite;\n}\n.fade-in[data-v-0996f7d4] {\n  animation: fadeIn-data-v-0996f7d4 0.5s ease-in-out;\n}\n@keyframes fadeIn-data-v-0996f7d4 {\nfrom {\n    opacity: 0;\n}\nto {\n    opacity: 1;\n}\n}\n@keyframes spin-data-v-0996f7d4 {\nto {\n    transform: rotate(360deg);\n}\n}\n\n/*# sourceMappingURL=st-pivottable.vue.map */", map: {"version":3,"sources":["st-pivottable.vue","/Users/daniel/Documents/work/stipple_app/pivot-table/lib/src/components/st-pivottable.vue"],"names":[],"mappings":"AAAA,gBAAgB;ACw5BhB;EACA,aAAA;EACA,2CAAA;EACA,YAAA;EACA,aAAA;EACA,sBAAA;EACA,sBAAA;ADt5BA;ACy5BA;EACA,aAAA;EACA,SAAA;EACA,oBAAA;EACA,OAAA;EACA,aAAA;ADt5BA;ACw5BA;EACA,OAAA;EACA,cAAA;EACA,aAAA;EACA,yCAAA;EACA,kBAAA;EACA,aAAA;EACA,sBAAA;ADt5BA;ACy5BA;EACA,UAAA;EACA,WAAA;ADv5BA;AC05BA;EACA,uBAAA;ADx5BA;AC25BA;EACA,mCAAA;EACA,kBAAA;ADz5BA;AC25BA;EACA,wEAAA;ADz5BA;AC45BA;EACA,uBAAA;AD15BA;AC65BA;EACA,cAAA;EACA,aAAA;EACA,yBAAA;EACA,YAAA;EACA,oCAAA;EACA,gDAAA;AD35BA;AC65BA;EACA,iBAAA;EACA,oCAAA;EACA,yCAAA;EACA,kBAAA;EACA,uBAAA;EACA,eAAA;EACA,eAAA;AD35BA;AC65BA;EACA,gEAAA;AD35BA;ACk6BA;EACA,OAAA;EACA,cAAA;EACA,aAAA;EACA,kBAAA;AD/5BA;ACi6BA;EACA,yBAAA;EACA,WAAA;AD/5BA;ACi6BA;EACA,yDAAA;EACA,gBAAA;EACA,iBAAA;AD/5BA;ACi6BA;EACA,gBAAA;EACA,gBAAA;EACA,OAAA;AD/5BA;ACo6BA;EACA,mBAAA;EACA,gBAAA;EACA,6BAAA;EACA,YAAA;EACA,sBAAA;ADl6BA;ACu6BA;EACA,MAAA;EACA,UAAA;ADr6BA;ACw6BA;EACA,UAAA;ADt6BA;AC66BA;EACA,SAAA;EACA,UAAA;AD36BA;ACi7BA;EACA,SAAA;EACA,UAAA;AD/6BA;ACo7BA;EACA,UAAA;EACA,UAAA;ADl7BA;ACu7BA;EACA,UAAA;EACA,UAAA;ADr7BA;AC07BA;EACA,UAAA;EACA,UAAA;ADx7BA;AC67BA;EACA,UAAA;AD37BA;AC+7BA;EACA,6BAAA;EACA,gCAAA;EACA,mBAAA;AD77BA;AC+7BA;EACA,mBAAA;AD77BA;ACm8BA;EACA,6BAAA;EACA,iBAAA;EACA,oBAAA;EACA,mBAAA;ADj8BA;ACm8BA;EACA,mBAAA;ADj8BA;ACq8BA;EACA,gCAAA;ADn8BA;ACy8BA;EACA,aAAA;EACA,mBAAA;EACA,QAAA;EACA,OAAA;ADt8BA;ACw8BA;EACA,YAAA;EACA,sBAAA;EACA,kBAAA;ADt8BA;AC08BA;EACA,eAAA;EACA,iBAAA;ADv8BA;ACy8BA;EACA,mBAAA;ADv8BA;AC08BA;EACA,mBAAA;ADx8BA;AC48BA;EACA,gBAAA;EACA,gBAAA;ADz8BA;AC48BA;EACA,6DAAA;ADz8BA;AC48BA;EACA,mBAAA;EACA,eAAA;ADz8BA;AC28BA;EACA,yBAAA;ADz8BA;AC68BA;EACA,aAAA;EACA,mBAAA;EACA,QAAA;AD18BA;AC68BA;EACA,gBAAA;EACA,YAAA;EACA,eAAA;EACA,UAAA;EACA,eAAA;EACA,WAAA;EACA,WAAA;EACA,YAAA;EACA,aAAA;EACA,mBAAA;EACA,uBAAA;AD18BA;AC48BA;EACA,gBAAA;EACA,kBAAA;AD18BA;AC88BA;EACA,mBAAA;EACA,6BAAA;EACA,6BAAA;AD38BA;AC68BA;EACA,eAAA;EACA,iBAAA;AD38BA;AC68BA;EACA,mBAAA;AD38BA;AC88BA;EACA,mBAAA;AD58BA;ACi9BA;EACA,mBAAA;EACA,2BAAA;EACA,iBAAA;EACA,4BAAA;AD98BA;ACk9BA;EACA,yBAAA;AD/8BA;ACm9BA;EACA,aAAA;EACA,mBAAA;EACA,8BAAA;EACA,QAAA;ADh9BA;ACm9BA;EACA,aAAA;EACA,mBAAA;EACA,QAAA;ADh9BA;ACm9BA;EACA,kBAAA;ADh9BA;ACw9BA;EACA,oBAAA;ADr9BA;AC69BA;EACA,eAAA;EACA,kBAAA;AD19BA;AC49BA;EACA,yBAAA;AD19BA;AC49BA;EACA,aAAA;EACA,kBAAA;EACA,QAAA;EACA,UAAA;EACA,eAAA;AD19BA;ACg+BA;EACA,eAAA;EACA,MAAA;EACA,OAAA;EACA,QAAA;EACA,SAAA;EACA,8BAAA;EACA,aAAA;EACA,mBAAA;EACA,uBAAA;EACA,aAAA;AD79BA;ACg+BA;EACA,oCAAA;EACA,uBAAA;EACA,kBAAA;EACA,UAAA;EACA,iBAAA;EACA,gBAAA;EACA,aAAA;EACA,sBAAA;EACA,yCAAA;AD79BA;AC+9BA;EACA,aAAA;EACA,6BAAA;EACA,aAAA;EACA,8BAAA;EACA,mBAAA;AD79BA;AC+9BA;EACA,SAAA;EACA,eAAA;EACA,uBAAA;AD79BA;ACg+BA;EACA,gBAAA;EACA,YAAA;EACA,eAAA;EACA,eAAA;EACA,WAAA;AD99BA;ACg+BA;EACA,uBAAA;AD99BA;ACm+BA;EACA,aAAA;EACA,cAAA;ADj+BA;ACm+BA;EACA,WAAA;EACA,yBAAA;ADj+BA;ACm+BA;EACA,YAAA;EACA,yDAAA;EACA,gBAAA;ADj+BA;ACo+BA;EACA,oCAAA;EACA,gBAAA;ADl+BA;ACq+BA;EACA,mBAAA;ADn+BA;ACs+BA;EACA,mBAAA;ADp+BA;AC0+BA;EACA,aAAA;EACA,mBAAA;EACA,uBAAA;EACA,iBAAA;EACA,eAAA;EACA,iEAAA;EACA,uBAAA;EACA,yCAAA;EAEA,aAAA;EACA,YAAA;EACA,kBAAA;ADx+BA;AC2+BA;EACA,aAAA;ADx+BA;AC2+BA;EACA,gBAAA;EACA,sBAAA;EACA,mBAAA;EACA,eAAA;EACA,kBAAA;ADx+BA;AC2+BA;EACA,mBAAA;EACA,kBAAA;ADx+BA;AC2+BA;EACA,eAAA;EACA,sBAAA;EACA,kBAAA;ADx+BA;AC2+BA;EACA,iBAAA;EACA,gBAAA;ADx+BA;AC2+BA;EACA,YAAA;EACA,6BAAA;EACA,mBAAA;ADx+BA;AC2+BA;EACA,WAAA;EACA,YAAA;EACA,kBAAA;ADx+BA;AC2+BA;EACA,aAAA;EACA,QAAA;ADx+BA;AC2+BA;EACA,gBAAA;EACA,eAAA;ADx+BA;AC2+BA;EACA,YAAA;ADx+BA;AC2+BA;EACA,aAAA;EACA,mBAAA;EACA,QAAA;EACA,cAAA;EACA,eAAA;ADx+BA;AC2+BA;EACA,mBAAA;ADx+BA;AC2+BA;EACA,aAAA;EACA,mBAAA;EACA,8BAAA;EACA,kBAAA;ADx+BA;AC2+BA;EACA,gBAAA;ADx+BA;AC2+BA;EACA,gBAAA;EACA,uBAAA;EACA,mBAAA;ADx+BA;AC2+BA;EACA,eAAA;EACA,sBAAA;EACA,kBAAA;EACA,iBAAA;ADx+BA;AC2+BA;EACA,iBAAA;EACA,gBAAA;ADx+BA;AC2+BA;EACA,gBAAA;EACA,MAAA;EACA,YAAA;EACA,6BAAA;EACA,mBAAA;EACA,UAAA;ADx+BA;AC2+BA;EACA,WAAA;EACA,YAAA;EACA,sBAAA;EACA,kBAAA;EACA,kBAAA;ADx+BA;AC2+BA;EACA,aAAA;EACA,QAAA;ADx+BA;AC2+BA;EACA,gBAAA;EACA,eAAA;EACA,sBAAA;EACA,kBAAA;EACA,iBAAA;EACA,eAAA;ADx+BA;AC2+BA;EACA,mBAAA;ADx+BA;AC2+BA;EACA,YAAA;ADx+BA;AC2+BA;EACA,aAAA;EACA,mBAAA;EACA,QAAA;EACA,gBAAA;EACA,eAAA;EACA,kBAAA;ADx+BA;AC2+BA;EACA,mBAAA;ADx+BA;AC2+BA;EACA,SAAA;ADx+BA;AC2+BA;EACA,cAAA;EACA,yBAAA;EACA,yBAAA;ADx+BA;AC2+BA;EACA,gBAAA;EACA,kBAAA;ADx+BA;AC2+BA;EACA,aAAA;EACA,sBAAA;EACA,mBAAA;EACA,uBAAA;EACA,iBAAA;EACA,uBAAA;EACA,gEAAA;EACA,aAAA;EACA,YAAA;EACA,kBAAA;EACA,SAAA;ADx+BA;AC2+BA;EACA,WAAA;EACA,YAAA;EACA,yCAAA;EACA,kCAAA;EACA,kBAAA;EACA,kDAAA;ADx+BA;AC2+BA;EACA,kDAAA;ADx+BA;AC2+BA;AACA;IACA,UAAA;ADx+BE;AC0+BF;IACA,UAAA;ADx+BE;AACF;AC2+BA;AACA;IACA,yBAAA;ADz+BE;AACF;;AAEA,4CAA4C","file":"st-pivottable.vue","sourcesContent":["@charset \"UTF-8\";\n.pivot-table {\n  padding: 20px;\n  /* font-family: Inter, Arial, sans-serif; */\n  height: 100%;\n  display: flex;\n  flex-direction: column;\n  box-sizing: border-box;\n}\n\n.pivot-table-layout {\n  display: flex;\n  gap: 20px;\n  align-items: stretch;\n  flex: 1;\n  min-height: 0;\n}\n.pivot-table-layout .table-container {\n  flex: 1;\n  overflow: auto;\n  min-height: 0;\n  border: solid 1px var(--st-color-neutral);\n  border-radius: 8px;\n  display: flex;\n  flex-direction: column;\n}\n.pivot-table-layout .table-container::-webkit-scrollbar {\n  width: 8px;\n  height: 8px;\n}\n.pivot-table-layout .table-container::-webkit-scrollbar-track {\n  background: transparent;\n}\n.pivot-table-layout .table-container::-webkit-scrollbar-thumb {\n  background: var(--st-color-neutral);\n  border-radius: 4px;\n}\n.pivot-table-layout .table-container::-webkit-scrollbar-thumb:hover {\n  background: color-mix(in srgb, var(--st-color-neutral) 80%, transparent);\n}\n.pivot-table-layout .table-container::-webkit-scrollbar-corner {\n  background: transparent;\n}\n.pivot-table-layout .table-container .table-actions {\n  flex: 0 0 auto;\n  display: flex;\n  justify-content: flex-end;\n  padding: 8px;\n  background: var(--st-dashboard-bg-1);\n  border-bottom: 1px solid var(--st-color-neutral);\n}\n.pivot-table-layout .table-container .table-actions .export-btn {\n  padding: 6px 12px;\n  background: var(--st-dashboard-bg-2);\n  border: 1px solid var(--st-color-neutral);\n  border-radius: 4px;\n  color: var(--st-text-1);\n  cursor: pointer;\n  font-size: 13px;\n}\n.pivot-table-layout .table-container .table-actions .export-btn:hover {\n  background: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n}\n\n.table-container {\n  flex: 1;\n  overflow: auto;\n  min-height: 0;\n  position: relative;\n}\n.table-container table {\n  border-collapse: collapse;\n  width: 100%;\n}\n.table-container table th, .table-container table td {\n  border: 1px solid var(--st-pivottable-col-headers-border);\n  padding: 4px 8px;\n  text-align: right;\n}\n.table-container table th:first-child, .table-container table td:first-child {\n  text-align: left;\n  position: sticky;\n  left: 0;\n}\n.table-container table th {\n  background: #f5f5f5;\n  position: sticky;\n  border-bottom: 1px solid #ddd;\n  height: 37px;\n  box-sizing: border-box;\n}\n.table-container table thead tr:nth-child(1) th {\n  top: 0;\n  z-index: 3;\n}\n.table-container table thead tr:nth-child(1) th:first-child {\n  z-index: 4;\n}\n.table-container table thead tr:nth-child(2) th {\n  top: 37px;\n  z-index: 2;\n}\n.table-container table thead tr:nth-child(3) th {\n  top: 74px;\n  z-index: 1;\n}\n.table-container table thead tr:nth-child(4) th {\n  top: 111px;\n  z-index: 1;\n}\n.table-container table thead tr:nth-child(5) th {\n  top: 148px;\n  z-index: 1;\n}\n.table-container table thead tr:nth-child(6) th {\n  top: 185px;\n  z-index: 1;\n}\n.table-container table tbody td:first-child {\n  z-index: 1;\n}\n.table-container table tr.subtotal-row td {\n  border-top: 2px solid #e9ecef;\n  border-bottom: 1px solid #dee2e6;\n  background: #f8f9fa;\n}\n.table-container table tr.subtotal-row td:first-child {\n  background: #f8f9fa;\n}\n.table-container table tr.total-row td {\n  border-top: 2px solid #dee2e6;\n  padding-top: 12px;\n  padding-bottom: 12px;\n  background: #f1f3f5;\n}\n.table-container table tr.total-row td:first-child {\n  background: #f1f3f5;\n}\n.table-container table tr.total-row:last-child td {\n  border-bottom: 2px solid #dee2e6;\n}\n\n.field-content {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  flex: 1;\n}\n.field-content select {\n  padding: 2px;\n  border: 1px solid #ddd;\n  border-radius: 3px;\n}\n\n.sortable-header {\n  cursor: pointer;\n  user-select: none;\n}\n.sortable-header:hover {\n  background: #e9e9e9;\n}\n.sortable-header.sorted {\n  background: #f0f0f0;\n}\n\n.sort-indicator {\n  margin-left: 4px;\n  font-size: 0.8em;\n}\n\n.totals-row {\n  border-top: 2px solid var(--st-pivottable-col-headers-border);\n}\n\n.row-label {\n  white-space: nowrap;\n  cursor: pointer;\n}\n.row-label:hover {\n  background-color: #f5f5f5;\n}\n\n.row-content {\n  display: flex;\n  align-items: center;\n  gap: 4px;\n}\n\n.expand-btn {\n  background: none;\n  border: none;\n  cursor: pointer;\n  padding: 0;\n  font-size: 12px;\n  color: #666;\n  width: 20px;\n  height: 20px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n.expand-btn:hover {\n  background: #eee;\n  border-radius: 3px;\n}\n\n.column-header {\n  background: #f5f5f5;\n  text-align: center !important;\n  border-bottom: 1px solid #ddd;\n}\n.column-header.sortable-header {\n  cursor: pointer;\n  user-select: none;\n}\n.column-header.sortable-header:hover {\n  background: #e9e9e9;\n}\n.column-header.sortable-header.sorted {\n  background: #f0f0f0;\n}\n\n.row-header {\n  background: #f5f5f5;\n  text-align: left !important;\n  font-weight: bold;\n  border-right: 2px solid #ddd;\n}\n\ntr.expanded > td {\n  background-color: #fafafa;\n}\n\n.header-content {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n}\n\n.header-controls {\n  display: flex;\n  align-items: center;\n  gap: 4px;\n}\n\n.column-header {\n  position: relative;\n}\n\n.pivot-table.is-dragging .drop-zone.drag-over .field-item {\n  pointer-events: none;\n}\n\n.value-cell.drillable {\n  cursor: pointer;\n  position: relative;\n}\n.value-cell.drillable:hover {\n  background-color: #f0f7ff;\n}\n.value-cell.drillable:hover::after {\n  content: \"🔍\";\n  position: absolute;\n  top: 2px;\n  right: 2px;\n  font-size: 10px;\n}\n\n.drill-modal-backdrop {\n  position: fixed;\n  top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  background: rgba(0, 0, 0, 0.5);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n\n.drill-modal {\n  background: var(--st-dashboard-bg-1);\n  color: var(--st-text-1);\n  border-radius: 8px;\n  width: 90%;\n  max-width: 1200px;\n  max-height: 90vh;\n  display: flex;\n  flex-direction: column;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);\n}\n.drill-modal .drill-modal-header {\n  padding: 16px;\n  border-bottom: 1px solid #eee;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}\n.drill-modal .drill-modal-header h3 {\n  margin: 0;\n  font-size: 18px;\n  color: var(--st-text-1);\n}\n.drill-modal .drill-modal-header .close-btn {\n  background: none;\n  border: none;\n  font-size: 24px;\n  cursor: pointer;\n  color: #666;\n}\n.drill-modal .drill-modal-header .close-btn:hover {\n  color: var(--st-text-1);\n}\n.drill-modal .drill-modal-body {\n  padding: 16px;\n  overflow: auto;\n}\n.drill-modal .drill-modal-body table {\n  width: 100%;\n  border-collapse: collapse;\n}\n.drill-modal .drill-modal-body table th, .drill-modal .drill-modal-body table td {\n  padding: 8px;\n  border: 1px solid var(--st-pivottable-col-headers-border);\n  text-align: left;\n}\n.drill-modal .drill-modal-body table th {\n  background: var(--st-dashboard-bg-2);\n  font-weight: 600;\n}\n.drill-modal .drill-modal-body table tr:nth-child(even) {\n  background: #f9f9f9;\n}\n.drill-modal .drill-modal-body table tr:hover {\n  background: #f0f7ff;\n}\n\n.no-results {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 200px;\n  font-size: 14px;\n  background: color-mix(in srgb, var(--st-text-1) 15%, transparent);\n  color: var(--st-text-1);\n  border: 1px solid var(--st-color-neutral);\n  padding: 1rem;\n  margin: 1rem;\n  border-radius: 4px;\n}\n\n.filter-type-toggle {\n  margin: 5px 0;\n}\n\n.toggle-btn {\n  padding: 4px 8px;\n  border: 1px solid #ddd;\n  background: #f5f5f5;\n  cursor: pointer;\n  border-radius: 4px;\n}\n\n.toggle-btn.active {\n  background: #e0e0e0;\n  border-color: #ccc;\n}\n\n.values-filter {\n  margin-top: 8px;\n  border: 1px solid #ddd;\n  border-radius: 4px;\n}\n\n.values-list {\n  max-height: 200px;\n  overflow-y: auto;\n}\n\n.values-list-header {\n  padding: 8px;\n  border-bottom: 1px solid #ddd;\n  background: #f5f5f5;\n}\n\n.values-search {\n  width: 100%;\n  padding: 4px;\n  margin-bottom: 8px;\n}\n\n.values-actions {\n  display: flex;\n  gap: 8px;\n}\n\n.values-actions button {\n  padding: 2px 6px;\n  font-size: 12px;\n}\n\n.values-options {\n  padding: 8px;\n}\n\n.value-option {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 4px 0;\n  cursor: pointer;\n}\n\n.value-option:hover {\n  background: #f5f5f5;\n}\n\n.field-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  margin-bottom: 8px;\n}\n\n.field-name {\n  font-weight: 500;\n}\n\n.value-label {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.values-filter {\n  margin-top: 8px;\n  border: 1px solid #ddd;\n  border-radius: 4px;\n  background: white;\n}\n\n.values-list {\n  max-height: 200px;\n  overflow-y: auto;\n}\n\n.values-list-header {\n  position: sticky;\n  top: 0;\n  padding: 8px;\n  border-bottom: 1px solid #ddd;\n  background: #f5f5f5;\n  z-index: 1;\n}\n\n.values-search {\n  width: 100%;\n  padding: 6px;\n  border: 1px solid #ddd;\n  border-radius: 4px;\n  margin-bottom: 8px;\n}\n\n.values-actions {\n  display: flex;\n  gap: 8px;\n}\n\n.values-actions button {\n  padding: 4px 8px;\n  font-size: 12px;\n  border: 1px solid #ddd;\n  border-radius: 4px;\n  background: white;\n  cursor: pointer;\n}\n\n.values-actions button:hover {\n  background: #f0f0f0;\n}\n\n.values-options {\n  padding: 8px;\n}\n\n.value-option {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 6px 8px;\n  cursor: pointer;\n  border-radius: 4px;\n}\n\n.value-option:hover {\n  background: #f5f5f5;\n}\n\n.value-option input[type=checkbox] {\n  margin: 0;\n}\n\n.no-results.error {\n  color: #dc3545;\n  background-color: #fff3f3;\n  border: 1px solid #ffcdd2;\n}\n\n.no-results.error ul {\n  margin: 0.5rem 0;\n  padding-left: 2rem;\n}\n\n.loading-state {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  min-height: 200px;\n  color: var(--st-text-1);\n  background: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n  padding: 2rem;\n  margin: 1rem;\n  border-radius: 8px;\n  gap: 1rem;\n}\n\n.loading-spinner {\n  width: 40px;\n  height: 40px;\n  border: 3px solid var(--st-color-neutral);\n  border-top-color: var(--st-text-1);\n  border-radius: 50%;\n  animation: spin 1s linear infinite;\n}\n\n.fade-in {\n  animation: fadeIn 0.5s ease-in-out;\n}\n\n@keyframes fadeIn {\n  from {\n    opacity: 0;\n  }\n  to {\n    opacity: 1;\n  }\n}\n@keyframes spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n\n/*# sourceMappingURL=st-pivottable.vue.map */","<template>\n    <div class=\"pivot-table\" :class=\"{ 'is-dragging': isDragging }\">\n      <div class=\"pivot-table-layout\">\n        <div class=\"table-container\">\n          <div v-if=\"isLoading\" class=\"loading-state fade-in\">\n            <div class=\"loading-spinner\"></div>\n            <p>Calculating pivot table results...</p>\n          </div>\n          <table v-else-if=\"!hasNoResults && !hasDuplicateFields && pivotData.rows.length\">\n              <thead>\n                  <!-- Row Headers -->\n                  <tr v-for=\"(headerRow, rowIndex) in pivotData.headers\" :key=\"rowIndex\">\n                      <!-- Row header column -->\n                      <th \n                          v-if=\"config.rows.length && rowIndex === 0\" \n                          :rowspan=\"pivotData.headers.length\"\n                          class=\"row-header\"\n                      >\n                          {{ config.rows.map(r => getFieldDisplayName(r)).join(' - ') }}\n                      </th>\n                      <!-- Column Headers -->\n                          <th  v-for=\"header in headerRow\" :key=\"header.id\"\n                              :colspan=\"header.colspan\"\n                              class=\"column-header\"\n                              :class=\"{\n                                  'sortable-header': rowIndex === pivotData.headers.length - 1,\n                                  'sorted': sortConfig.column === header.id,\n                                  'sorted-asc': sortConfig.column === header.id && sortConfig.direction === 'asc',\n                                  'sorted-desc': sortConfig.column === header.id && sortConfig.direction === 'desc'\n                              }\"\n                              @click=\"rowIndex === pivotData.headers.length - 1 && toggleSort(header)\"\n                          >\n                              <div class=\"header-content\">\n                                  <span>{{ header.label }}</span>\n                                  <div class=\"header-controls\" v-if=\"rowIndex === pivotData.headers.length - 1\">\n                                  </div>\n                              </div>\n                          </th>\n                  </tr>\n              </thead>\n              <tbody>\n                  <recursive-pivot-rows\n                      v-for=\"row in flattenedRows\"\n                      :key=\"row.id\"\n                      :row=\"row\"\n                      :config=\"config\"\n                      :expanded-rows=\"expandedRowsArray\"\n                      @toggle-expand=\"toggleExpand\"\n                      @cell-click=\"onCellClick\"\n                  />\n                  \n                  <!-- Totals row -->\n                  <tr v-if=\"pivotData.totals\" class=\"totals-row\">\n                      <td v-if=\"config.rows.length\"><strong>Total</strong></td>\n                      <td v-for=\"cell in pivotData.totals.cells\" :key=\"cell.id\">\n                          <strong>{{ formatValue(cell.value) }}</strong>\n                      </td>\n                  </tr>\n              </tbody>\n          </table>\n          <div v-else-if=\"hasDuplicateFields\" class=\"no-results error\">\n            <div style=\"line-height: 1.5rem;\">\n                <b>Configuration Error</b> <br/>\n                The following {{ duplicateFields.length > 1 ? 'fields' : 'field' }} cannot be used as both row and column:\n                <ul>\n                <li v-for=\"field in duplicateFields\" :key=\"field\">{{ field }}</li>\n                </ul>\n                Please remove {{ duplicateFields.length > 1 ? 'them' : 'it' }} from either rows or columns.\n            </div>\n          </div>\n          <div v-else-if=\"hasNoResults\" class=\"no-results\">\n            <p>No data matches the current filters</p>\n          </div>\n        </div>\n\n        <st-pivottable-controls\n          :data=\"rowBasedData\"\n          :rows=\"config.rows\"\n          :columns=\"config.columns\"\n          :values=\"config.values\"\n          :filters=\"internalFilters\"\n          :has-no-results=\"hasNoResults\"\n          :filter-results=\"filterResults\"\n          @configChanged=\"onConfigChanged\"\n          @filtersChanged=\"onFiltersChanged\"\n          @export=\"exportToCsv\"\n        />\n      </div>\n\n      <DrillThroughModal\n        v-if=\"drillThroughData\"\n        :data=\"drillThroughData\"\n        :columns=\"drillThroughColumns\"\n        :title=\"drillThroughTitle\"\n        @close=\"closeDrillThrough\"\n      />\n    </div>\n</template>\n\n<script>\nimport { PivotProcessor } from '../utils/pivotUtils'\nimport DrillThroughModal from './DrillThroughModal.vue'\nimport StPivottableControls from './st-pivottable-controls.vue'\nimport RecursivePivotRows from './recursive-pivot-rows.vue'\n\nexport default {\n    name: 'st-pivottable',\n    components: {\n        DrillThroughModal,\n        StPivottableControls,\n        RecursivePivotRows\n    },\n    \n    props: {\n        data: {\n            type: [Array, Object],\n            required: true,\n            validator: function(value) {\n                if (Array.isArray(value)) {\n                    // For array format, each item must be an object\n                    return value.every(item => typeof item === 'object' && item !== null);\n                } else if (typeof value === 'object' && value !== null) {\n                    // For column-based format, each property must be an array of the same length\n                    const lengths = Object.values(value).map(arr => Array.isArray(arr) ? arr.length : -1);\n                    return lengths.length > 0 && lengths.every(len => len === lengths[0] && len >= 0);\n                }\n                return false;\n            }\n        },\n        rows: {\n            type: Array,\n            default: () => [],\n            validator: (value) => value.every(item => {\n                const hasField = typeof item === 'object' && typeof item.field === 'string';\n                const hasValidLabel = !item.label || typeof item.label === 'string';\n                return hasField && hasValidLabel;\n            })\n        },\n        columns: {\n            type: Array,\n            default: () => [],\n            validator: (value) => value.every(item => {\n                const hasField = typeof item === 'object' && typeof item.field === 'string';\n                const hasValidLabel = !item.label || typeof item.label === 'string';\n                return hasField && hasValidLabel;\n            })\n        },\n        values: {\n            type: Array,\n            default: () => [],\n            validator: (value) => value.every(item => {\n                const hasField = typeof item === 'object' && typeof item.field === 'string';\n                const hasValidLabel = !item.label || typeof item.label === 'string';\n                const hasAggregation = typeof item.aggregation === 'string';\n                return hasField && hasValidLabel && hasAggregation;\n            })\n        },\n        filters: {\n            type: Array,\n            default: () => [],\n            validator: (value) => value.every(item => {\n                const typeOfItem = typeof item;\n                const typeOfField = typeof item.field;    \n                const typeOfFilterType = typeof item.filterType;\n\n                let isValid = true;\n\n                if( typeOfItem !== 'object' ){\n                    isValid = false;\n                    console.log( \"filter_validation:typeOfItem: \", typeOfItem );\n                }\n                if( typeOfField !== 'string' ) {\n                    isValid = false;\n                    console.log( \"filter_validation:typeOfField: \", typeOfField );\n                }\n                if( typeOfFilterType !== 'string' ) {\n                    isValid = false;\n                    console.log( \"filter_validation:typeOfFilterType: \", typeOfFilterType );\n                }\n\n                if( isValid ) {\n                    if( item.filterType === 'condition' ) {\n                        if( typeof item.condition !== 'string' ) {\n                            isValid = false;\n                            console.log( \"filter_validation:typeOfCondition: \", typeof item.condition, item.condition );\n                        }else if( item.value === undefined ) {\n                            isValid = false;\n                            console.log( \"filter_validation:value: \", item.value );\n                        }\n                    }else if( item.filterType === 'values' ) {\n                        if( !Array.isArray(item.selectedValues) ) {\n                            isValid = false;\n                            console.log( \"filter_validation:selectedValues: \", Array.isArray(item.selectedValues), item.selectedValues );\n                        }\n                    }\n                }\n\n                return isValid;\n            })\n        }\n    },\n\n    data() {\n        const normalizedData = this.normalizeData(this.data);\n        return {\n            config: {\n                rows: (this.rows || []).map(row => ({\n                    ...row,\n                    sortBy: row.sortBy || 'label',\n                    sortOrder: row.sortOrder || 'asc'\n                })),\n                columns: (this.columns || []).map(col => ({\n                    ...col,\n                    sortBy: col.sortBy || 'label',\n                    sortOrder: col.sortOrder || 'asc'\n                })),\n                values: this.values || []\n            },\n            isDragging: false,\n            isLoading: false,\n            expandedRowsArray: [],\n            sortConfig: {\n                column: null,\n                direction: 'asc'\n            },\n            pivotData: {\n                headers: [],\n                rows: [],\n                totals: null\n            },\n            drillThroughData: null,\n            drillThroughColumns: [],\n            drillThroughTitle: '',\n            filteredData: [],\n            rowBasedData: normalizedData,\n            internalFilters: [...(this.filters || [])],\n            filterTypes: {\n                condition: 'Filter by Condition',\n                values: 'Filter by Values'\n            },\n            uniqueValuesCache: {},\n            renderStartTime: performance.now(),\n            filterResults: {}\n        }\n    },\n\n    computed: {\n        flattenedRows() {\n            const flattened = [];\n            console.log('Computing flattenedRows. Current expandedRowsArray:', this.expandedRowsArray);\n            \n            const addRow = (row, parentVisible = true) => {\n                console.log('Processing row:', {\n                    id: row.id,\n                    label: row.label,\n                    depth: row.depth,\n                    hasChildren: row.hasChildren,\n                    parentVisible,\n                    isExpanded: this.isExpanded(row.id)\n                });\n                \n                // A row is visible if its parent is visible\n                const isVisible = parentVisible;\n                \n                if (isVisible) {\n                    flattened.push(row);\n                    console.log('Added row to flattened array:', row.label);\n                }\n                \n                // Only process children if this row is expanded\n                if (row.hasChildren && this.isExpanded(row.id)) {\n                    console.log('Processing children of row:', row.label);\n                    row.children.forEach(child => {\n                        // Child rows are only visible if parent is visible and expanded\n                        addRow(child, isVisible);\n                    });\n                }\n            };\n            \n            // Process top-level rows\n            console.log('Processing top-level rows:', this.pivotData.rows.length);\n            this.pivotData.rows.forEach(row => {\n                addRow(row, true);\n            });\n            \n            console.log('Final flattened rows:', flattened.map(r => ({ id: r.id, label: r.label, depth: r.depth })));\n            return flattened;\n        },\n\n        hasNoResults() {\n            return this.filteredData && this.filteredData.length === 0;\n        },\n\n        getUniqueValues() {\n            return (column) => {\n                if (!this.uniqueValuesCache[column]) {\n                    const values = new Set();\n                    this.filteredData.forEach(row => {\n                        if (row[column] !== null && row[column] !== undefined) {\n                            values.add(row[column]);\n                        }\n                    });\n                    this.uniqueValuesCache[column] = Array.from(values).sort((a, b) => {\n                        return String(a).localeCompare(String(b));\n                    });\n                }\n                return this.uniqueValuesCache[column];\n            };\n        },\n\n        duplicateFields() {\n            const rowFields = this.config.rows.map(r => r.field);\n            const columnFields = this.config.columns.map(c => c.field);\n            return rowFields.filter(field => columnFields.includes(field));\n        },\n        \n        hasDuplicateFields() {\n            return this.duplicateFields.length > 0;\n        }\n    },\n\n    methods: {\n        getFieldDisplayName(fieldConfig) {\n            return fieldConfig.label || fieldConfig.field;\n        },\n\n        normalizeData(data) {\n            if (Array.isArray(data)) {\n                return data;\n            }\n\n            // Convert column-based format to row-based format\n            if (typeof data === 'object' && data !== null) {\n                const columns = Object.keys(data);\n                const rowCount = data[columns[0]].length;\n                const rows = [];\n\n                for (let i = 0; i < rowCount; i++) {\n                    const row = {};\n                    columns.forEach(col => {\n                        row[col] = data[col][i];\n                    });\n                    rows.push(row);\n                }\n\n                return rows;\n            }\n\n            return [];\n        },\n\n\n        async applyFilters() {\n            this.isLoading = true;\n            console.log('[PV]: applyFilters() start - isLoading: ', this.isLoading);\n            setTimeout(() => {\n                try {\n                    console.log('st-pivottable: applyFilters: ', this.internalFilters);\n                    if (!this.rowBasedData) {\n                        return;\n                    }\n                    if (!this.rowBasedData || !this.rowBasedData.length) {\n                        return;\n                    }\n\n                    // Reset filter results\n                    this.filterResults = {};\n\n                    // Test each filter individually first\n                    this.internalFilters.forEach(filter => {\n                        const filteredCount = this.rowBasedData.filter(row => {\n                            const value = row[filter.field];\n                            \n                            if (filter.filterType === 'values') {\n                                return filter.selectedValues.length === 0 || filter.selectedValues.includes(value);\n                            }\n\n                            const filterValue = filter.value;\n                            let result;\n\n                            switch (filter.condition) {\n                                case 'equals':\n                                    result = value == filterValue;\n                                    break;\n                                case 'notEquals':\n                                    result = value != filterValue;\n                                    break;\n                                case 'greaterThan':\n                                    result = value > filterValue;\n                                    break;\n                                case 'greaterThanOrEqual':\n                                    result = value >= filterValue;\n                                    break;\n                                case 'lessThan':\n                                    result = value < filterValue;\n                                    break;\n                                case 'lessThanOrEqual':\n                                    result = value <= filterValue;\n                                    break;\n                                case 'contains':\n                                    result = String(value).toLowerCase().includes(String(filterValue).toLowerCase());\n                                    break;\n                                case 'notContains':\n                                    result = !String(value).toLowerCase().includes(String(filterValue).toLowerCase());\n                                    break;\n                                case 'startsWith':\n                                    result = String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());\n                                    break;\n                                case 'endsWith':\n                                    result = String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());\n                                    break;\n                                case 'isEmpty':\n                                    result = value === null || value === undefined || value === '';\n                                    break;\n                                case 'isNotEmpty':\n                                    result = value !== null && value !== undefined && value !== '';\n                                    break;\n                                default:\n                                    result = true;\n                            }\n                            return result;\n                        }).length;\n\n                        this.filterResults[filter.field] = filteredCount > 0;\n                    });\n\n                    // Now apply all filters together as before\n                    this.filteredData = this.rowBasedData.filter(row => {\n                        return this.internalFilters.every(filter => {\n                            const value = row[filter.field];\n\n                            if (filter.filterType === 'values') {\n                                return filter.selectedValues.length === 0 || filter.selectedValues.includes(value);\n                            }\n\n                            const filterValue = filter.value;\n                            let result;\n\n                            switch (filter.condition) {\n                                case 'equals':\n                                    result = value == filterValue;\n                                    break;\n                                case 'notEquals':\n                                    result = value != filterValue;\n                                    break;\n                                case 'greaterThan':\n                                    result = value > filterValue;\n                                    break;\n                                case 'greaterThanOrEqual':\n                                    result = value >= filterValue;\n                                    break;\n                                case 'lessThan':\n                                    result = value < filterValue;\n                                    break;\n                                case 'lessThanOrEqual':\n                                    result = value <= filterValue;\n                                    break;\n                                case 'contains':\n                                    result = String(value).toLowerCase().includes(String(filterValue).toLowerCase());\n                                    break;\n                                case 'notContains':\n                                    result = !String(value).toLowerCase().includes(String(filterValue).toLowerCase());\n                                    break;\n                                case 'startsWith':\n                                    result = String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());\n                                    break;\n                                case 'endsWith':\n                                    result = String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());\n                                    break;\n                                case 'isEmpty':\n                                    result = value === null || value === undefined || value === '';\n                                    break;\n                                case 'isNotEmpty':\n                                    result = value !== null && value !== undefined && value !== '';\n                                    break;\n                                default:\n                                    result = true;\n                            }\n                            return result;\n                        });\n                    });\n\n                    console.log('Filtered data length:', this.filteredData.length);\n                    \n                    if (this.filteredData && this.filteredData.length) {\n                        const processor = new PivotProcessor(this.filteredData, this.config);\n                        this.pivotData = processor.process(this.sortConfig);\n                    }\n                } finally {\n                    this.isLoading = false;\n                    console.log('[PV]: applyFilters() end - isLoading: ', this.isLoading);\n                }\n            }, 1);\n        },\n\n        async updatePivotData() {\n            this.isLoading = true;\n            setTimeout(() => {\n                try {\n                    if (this.filteredData && this.filteredData.length) {\n                        const processor = new PivotProcessor(this.filteredData, this.config);\n                        this.pivotData = processor.process(this.sortConfig);\n                    } else {\n                        // Create an empty pivot data structure that maintains headers\n                        this.pivotData = {\n                            headers: this.generateEmptyHeaders(),\n                            rows: [],\n                            totals: {\n                                cells: this.config.values.map(value => ({\n                                    id: `total_${value.field}_${value.aggregation}`,\n                                    value: 0\n                                }))\n                            }\n                        };\n                    }\n                } finally {\n                    this.isLoading = false;\n                }\n            }, 1);\n        },\n\n        generateEmptyHeaders() {\n            const headers = [];\n            \n            // If we have column fields, create header structure\n            if (this.config.columns.length) {\n                // Add empty header rows for each column field\n                this.config.columns.forEach((col, index) => {\n                    headers.push([{\n                        id: `empty_header_${index}`,\n                        label: '',\n                        colspan: 1,\n                        depth: index\n                    }]);\n                });\n            } else if (this.config.values.length) {\n                // If no column fields but we have values, add single header row\n                headers.push([{\n                    id: 'empty_value_header',\n                    label: this.getFieldDisplayName(this.config.values[0]),\n                    colspan: 1,\n                    depth: 0\n                }]);\n            }\n            \n            return headers;\n        },\n\n        onConfigChanged(newConfig) {\n            this.config = newConfig;\n            this.updatePivotData();\n        },\n        \n        onFiltersChanged(newFilters) {\n            console.log( 'onFiltersChanged', newFilters );\n            this.internalFilters = newFilters;\n            this.applyFilters();\n        },\n\n        toggleSort(header) {\n            if (this.sortConfig.column === header.id) {\n                this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';\n            } else {\n                this.sortConfig.column = header.id;\n                this.sortConfig.direction = 'asc';\n            }\n            this.updatePivotData();\n        },\n\n        formatValue(value) {\n            return typeof value === 'number' ? value.toLocaleString() : value;\n        },\n\n        isExpanded(rowId) {\n            const expanded = this.expandedRowsArray.includes(rowId);\n            console.log('Checking expansion state:', { rowId, expanded });\n            return expanded;\n        },\n\n        toggleExpand(rowId) {\n            console.log('Toggling expansion for row:', rowId);\n            console.log('Current expandedRowsArray:', [...this.expandedRowsArray]);\n            \n            const index = this.expandedRowsArray.indexOf(rowId);\n            if (index > -1) {\n                console.log('Collapsing row:', rowId);\n                // When collapsing a row, also collapse all its descendants\n                const rowToCollapse = this.findRowById(rowId, this.pivotData.rows);\n                console.log('Found row to collapse:', rowToCollapse);\n                \n                if (rowToCollapse) {\n                    const descendantIds = this.getDescendantIds(rowToCollapse);\n                    console.log('Descendant IDs to collapse:', descendantIds);\n                    \n                    this.expandedRowsArray = this.expandedRowsArray.filter(id => \n                        id !== rowId && !descendantIds.includes(id)\n                    );\n                } else {\n                    console.log('Row not found, simple removal');\n                    this.expandedRowsArray.splice(index, 1);\n                }\n            } else {\n                console.log('Expanding row:', rowId);\n                this.expandedRowsArray.push(rowId);\n            }\n            console.log('New expandedRowsArray:', [...this.expandedRowsArray]);\n        },\n\n        findRowById(id, rows) {\n            console.log('Finding row by ID:', id);\n            for (const row of rows) {\n                if (row.id === id) {\n                    console.log('Found row:', row);\n                    return row;\n                }\n                if (row.children) {\n                    const found = this.findRowById(id, row.children);\n                    if (found) return found;\n                }\n            }\n            return null;\n        },\n\n        getDescendantIds(row) {\n            console.log('Getting descendant IDs for row:', row.label);\n            const ids = [];\n            if (row.children) {\n                row.children.forEach(child => {\n                    ids.push(child.id);\n                    ids.push(...this.getDescendantIds(child));\n                });\n            }\n            console.log('Found descendant IDs:', ids);\n            return ids;\n        },\n\n        isDrillableCell(cell) {\n            // For now, consider all value cells as drillable\n            // Later we can add more specific conditions\n            return cell && typeof cell.value === 'number';\n        },\n\n        onCellClick(cell, row) {\n            if (!this.isDrillableCell(cell)) return;\n            \n            // Get the column configuration from the cell's position\n            const columnIndex = row.cells.indexOf(cell);\n            console.log('Column index:', columnIndex);\n            console.log('Row:', row);\n            \n            // Get all header levels for this column\n            const headerLevels = [];\n            for (let level = 0; level < this.pivotData.headers.length; level++) {\n                const headerRow = this.pivotData.headers[level];\n                let currentIndex = 0;\n                for (const header of headerRow) {\n                    if (currentIndex <= columnIndex && currentIndex + header.colspan > columnIndex) {\n                        headerLevels.push(header);\n                        break;\n                    }\n                    currentIndex += header.colspan;\n                }\n            }\n            console.log('Header levels:', headerLevels);\n            \n            // Build filters based on row path and column path\n            const filters = {};\n            \n            // Collect all row values up the hierarchy\n            const rowValues = [];\n            let currentRow = row;\n            while (currentRow && currentRow.label) {\n                rowValues.unshift({\n                    label: currentRow.label,\n                    depth: currentRow.depth\n                });\n                currentRow = currentRow.parent;\n            }\n            console.log('Row hierarchy:', rowValues);\n            \n            // Map row values to fields based on depth\n            this.config.rows.forEach((rowField, index) => {\n                const rowValue = rowValues.find(rv => rv.depth === index);\n                if (rowValue) {\n                    filters[rowField.field] = rowValue.label;\n                    console.log(`Adding row filter: ${rowField.field} = ${rowValue.label}`);\n                }\n            });\n            \n            // Add column dimension filters by mapping header levels to column fields\n            this.config.columns.forEach((colField, index) => {\n                const headerLevel = headerLevels[index];\n                if (headerLevel && headerLevel.label) {\n                    filters[colField.field] = headerLevel.label;\n                    console.log(`Adding column filter: ${colField.field} = ${headerLevel.label}`);\n                }\n            });\n            \n            console.log('Applied filters:', filters);\n            \n            // Filter the source data\n            const filteredData = this.filteredData.filter(record => {\n                const matches = Object.entries(filters).every(([field, value]) => {\n                    const match = record[field] === value;\n                    return match;\n                });\n                return matches;\n            });\n            \n            console.log(`Found ${filteredData.length} matching records out of ${this.filteredData.length} total`);\n            \n            // Update modal data\n            const rowPath = rowValues.map(r => r.label).join(' / ');\n            const columnPath = headerLevels.map(h => h.label).join(' / ');\n            this.drillThroughTitle = `Drill Through - ${rowPath} (${columnPath})`;\n            this.drillThroughColumns = Object.keys(this.filteredData[0]);\n            this.drillThroughData = filteredData;\n        },\n\n        closeDrillThrough() {\n            this.drillThroughData = null;\n            this.drillThroughColumns = [];\n            this.drillThroughTitle = '';\n        },\n\n        addNewFilter() {\n            if (this.selectedColumn) {\n                const newFilter = {\n                    column: this.selectedColumn,\n                    filterType: 'condition', // Default to condition for backward compatibility\n                    condition: this.getDefaultCondition(this.selectedColumn),\n                    value: '',\n                    selectedValues: [] // For values filter type\n                };\n                this.internalFilters.push(newFilter);\n                this.selectedColumn = null;\n                this.showColumnSelect = false;\n                console.log( 'addNewFilter: ', this.internalFilters );\n                this.$emit('filtersChanged', this.internalFilters);\n            }\n        },\n\n        toggleFilterType(filter) {\n            filter.filterType = filter.filterType === 'condition' ? 'values' : 'condition';\n            if (filter.filterType === 'values') {\n                filter.selectedValues = [];\n            } else {\n                filter.condition = this.getDefaultCondition(filter.column);\n                filter.value = '';\n            }\n            this.filterChanged();\n        },\n\n        selectAllValues(filter) {\n            filter.selectedValues = [...this.getUniqueValues(filter.column)];\n            this.filterChanged();\n        },\n\n        clearValues(filter) {\n            filter.selectedValues = [];\n            this.filterChanged();\n        },\n\n        filteredValues(filter) {\n            const values = this.getUniqueValues(filter.column);\n            if (!filter.searchQuery) return values;\n            \n            const searchTerm = filter.searchQuery.toLowerCase();\n            return values.filter(value => \n                String(value).toLowerCase().includes(searchTerm)\n            );\n        },\n\n        exportToCsv() {\n            // Get all header rows\n            const headerRows = this.pivotData.headers.map((headerRow, rowIndex) => {\n                // For each header row, create an array with row field names or empty cells\n                const rowFieldCells = rowIndex === 0 \n                    ? this.config.rows.map(r => r.field)  // First row gets the field names\n                    : Array(this.config.rows.length).fill(''); // Other rows get empty cells\n                \n                // For each header in this row, repeat the label based on its colspan\n                const headerCells = [];\n                headerRow.forEach(header => {\n                    // Repeat the header label for its colspan\n                    for (let i = 0; i < header.colspan; i++) {\n                        headerCells.push(header.label);\n                    }\n                });\n                \n                return [...rowFieldCells, ...headerCells];\n            });\n            \n            // Process rows recursively, including row headers and values\n            const processRow = (row, parentIndent = '') => {\n                const rowData = [];\n                \n                // Add row headers with proper indentation\n                const indent = parentIndent + (row.depth > 0 ? '  ' : '');\n                const rowHeaders = Array(this.config.rows.length).fill('');\n                rowHeaders[row.depth] = indent + row.label;\n                \n                // Add cell values\n                const values = row.cells.map(cell => this.formatValue(cell.value));\n                \n                rowData.push([...rowHeaders, ...values]);\n                \n                // Process children if any\n                if (row.children) {\n                    row.children.forEach(child => {\n                        rowData.push(...processRow(child, indent));\n                    });\n                }\n                \n                return rowData;\n            };\n            \n            // Get all row data\n            const rows = this.pivotData.rows.flatMap(row => processRow(row));\n            \n            // Add totals row if exists\n            if (this.pivotData.totals) {\n                const totalRow = [\n                    'Total',\n                    ...Array(this.config.rows.length - 1).fill(''),\n                    ...this.pivotData.totals.cells.map(cell => this.formatValue(cell.value))\n                ];\n                rows.push(totalRow);\n            }\n            \n            // Combine headers and rows\n            const csvContent = [\n                ...headerRows,  // Include all header rows\n                ...rows\n            ]\n                .map(row => row.map(cell => {\n                    // Escape cells containing commas or quotes\n                    const cellStr = String(cell);\n                    return cellStr.includes(',') || cellStr.includes('\"') \n                        ? `\"${cellStr.replace(/\"/g, '\"\"')}\"` \n                        : cellStr;\n                }).join(','))\n                .join('\\n');\n            \n            // Create and trigger download\n            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });\n            const link = document.createElement('a');\n            const timestamp = new Date().toISOString().replace(/[:.]/g, '_');\n            link.href = URL.createObjectURL(blob);\n            link.download = `pivot_table_export_${timestamp}.csv`;\n            link.click();\n            URL.revokeObjectURL(link.href);\n        },\n    },\n\n    watch: {\n        rows: {\n            handler(newRows) {\n                this.config.rows = (newRows || []).map(row => ({\n                    ...row,\n                    sortBy: row.sortBy || 'label',\n                    sortOrder: row.sortOrder || 'asc'\n                }));\n                this.updatePivotData();\n            },\n            deep: true\n        },\n        columns: {\n            handler(newColumns) {\n                this.config.columns = (newColumns || []).map(col => ({\n                    ...col,\n                    sortBy: col.sortBy || 'label',\n                    sortOrder: col.sortOrder || 'asc'\n                }));\n                this.updatePivotData();\n            },\n            deep: true\n        },\n        values: {\n            handler(newValues) {\n                this.config.values = newValues;\n                this.updatePivotData();\n            },\n            deep: true\n        },\n        data: {\n            immediate: true,\n            handler(newData) {\n                this.rowBasedData = this.normalizeData(newData);\n                this.applyFilters();\n            }\n        },\n        filters: {\n            immediate: true,\n            handler(newFilters) {\n                console.log('[PV]: watch.filters.handler: ', newFilters);\n                this.internalFilters = [...(newFilters || [])];\n                if (this.rowBasedData) {\n                    this.applyFilters();\n                }\n            },\n            deep: false\n        }\n    },\n\n    mounted() {\n        this.$nextTick(() => {\n            this.applyFilters();\n            const renderTime = performance.now() - this.renderStartTime;\n            console.log('PivotTable Render Time:', {\n                totalTime: `${Math.round(renderTime)}ms`,\n                rowCount: this.filteredData?.length || 0,\n                dataFormat: Array.isArray(this.data) ? 'row-oriented' : 'column-oriented'\n            });\n        });\n    }\n}\n</script>\n\n<style lang=\"scss\" scoped>\n.pivot-table {\n    padding: 20px;\n    /* font-family: Inter, Arial, sans-serif; */\n    height: 100%;\n    display: flex;\n    flex-direction: column;\n    box-sizing: border-box;\n}\n\n.pivot-table-layout {\n    display: flex;\n    gap: 20px;\n    align-items: stretch;\n    flex: 1;\n    min-height: 0; // Important for flex child scrolling\n    \n    .table-container {\n        flex: 1;\n        overflow: auto;\n        min-height: 0; // Important for flex child scrolling\n        border: solid 1px var(--st-color-neutral);\n        border-radius: 8px;\n        display: flex;\n        flex-direction: column;\n\n        // Improve scrollbar styling\n        &::-webkit-scrollbar {\n            width: 8px;\n            height: 8px;\n        }\n\n        &::-webkit-scrollbar-track {\n            background: transparent;\n        }\n\n        &::-webkit-scrollbar-thumb {\n            background: var(--st-color-neutral);\n            border-radius: 4px;\n\n            &:hover {\n            background: color-mix(in srgb, var(--st-color-neutral) 80%, transparent);\n            }\n        }\n        &::-webkit-scrollbar-corner {\n           background: transparent;\n        }\n        \n        .table-actions {\n            flex: 0 0 auto;\n            display: flex;\n            justify-content: flex-end;\n            padding: 8px;\n            background: var(--st-dashboard-bg-1);\n            border-bottom: 1px solid var(--st-color-neutral);\n            \n            .export-btn {\n                padding: 6px 12px;\n                background: var(--st-dashboard-bg-2);\n                border: 1px solid var(--st-color-neutral);\n                border-radius: 4px;\n                color: var(--st-text-1);\n                cursor: pointer;\n                font-size: 13px;\n                \n                &:hover {\n                    background: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n                }\n            }\n        }\n    }\n}\n\n.table-container {\n    flex: 1;\n    overflow: auto;\n    min-height: 0;\n    position: relative;\n    \n    table {\n        border-collapse: collapse;\n        width: 100%;\n        \n        th, td {\n            border: 1px solid var(--st-pivottable-col-headers-border);\n            padding: 4px 8px;\n            text-align: right;\n            \n            &:first-child {\n                text-align: left;\n                position: sticky;\n                left: 0;\n            }\n        }\n        \n        // All header cells\n        th {\n            background: #f5f5f5;\n            position: sticky;\n            border-bottom: 1px solid #ddd;\n            height: 37px; // Fixed height for header cells\n            box-sizing: border-box;\n        }\n\n        // First row (top-most header)\n        thead tr:nth-child(1) {\n            th {\n                top: 0;\n                z-index: 3;\n\n                // Business Unit - Department cell\n                &:first-child {\n                    z-index: 4;\n                }\n            }\n        }\n\n        // Second row (middle header)\n        thead tr:nth-child(2) {\n            th {\n                top: 37px; // Exactly one header height\n                z-index: 2;\n            }\n        }\n\n        // Third row (bottom header)\n        thead tr:nth-child(3) {\n            th {\n                top: 74px; // Exactly two header heights\n                z-index: 1;\n            }\n        }\n        // Fourth row (bottom header)\n        thead tr:nth-child(4) {\n            th {\n                top: 111px; // Exactly three header heights\n                z-index: 1;\n            }\n        }\n        // Fifth row (bottom header)\n        thead tr:nth-child(5) {\n            th {\n                top: 148px; // Exactly four header heights\n                z-index: 1;\n            }\n        }\n        // Sixth row (bottom header)\n        thead tr:nth-child(6) {\n            th {\n                top: 185px; // Exactly five header heights\n                z-index: 1;\n            }\n        }\n\n        // Body first column\n        tbody td:first-child {\n            z-index: 1;\n        }\n\n        tr.subtotal-row {\n            td {\n                border-top: 2px solid #e9ecef;\n                border-bottom: 1px solid #dee2e6;\n                background: #f8f9fa;\n\n                &:first-child {\n                    background: #f8f9fa;\n                }\n            }\n        }\n\n        tr.total-row {\n            td {\n                border-top: 2px solid #dee2e6;\n                padding-top: 12px;\n                padding-bottom: 12px;\n                background: #f1f3f5;\n\n                &:first-child {\n                    background: #f1f3f5;\n                }\n            }\n\n            &:last-child td {\n                border-bottom: 2px solid #dee2e6;\n            }\n        }\n    }\n}\n\n.field-content {\n    display: flex;\n    align-items: center;\n    gap: 8px;\n    flex: 1;\n    \n    select {\n        padding: 2px;\n        border: 1px solid #ddd;\n        border-radius: 3px;\n    }\n}\n\n.sortable-header {\n    cursor: pointer;\n    user-select: none;\n    \n    &:hover {\n        background: #e9e9e9;\n    }\n    \n    &.sorted {\n        background: #f0f0f0;\n    }\n}\n\n.sort-indicator {\n    margin-left: 4px;\n    font-size: 0.8em;\n}\n\n.totals-row {\n    border-top: 2px solid var(--st-pivottable-col-headers-border);\n}\n\n.row-label {\n    white-space: nowrap;\n    cursor: pointer;\n    \n    &:hover {\n        background-color: #f5f5f5;\n    }\n}\n\n.row-content {\n    display: flex;\n    align-items: center;\n    gap: 4px;\n}\n\n.expand-btn {\n    background: none;\n    border: none;\n    cursor: pointer;\n    padding: 0;\n    font-size: 12px;\n    color: #666;\n    width: 20px;\n    height: 20px;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    \n    &:hover {\n        background: #eee;\n        border-radius: 3px;\n    }\n}\n\n.column-header {\n    background: #f5f5f5;\n    text-align: center !important;\n    border-bottom: 1px solid #ddd;\n    \n    &.sortable-header {\n        cursor: pointer;\n        user-select: none;\n        \n        &:hover {\n            background: #e9e9e9;\n        }\n        \n        &.sorted {\n            background: #f0f0f0;\n        }\n    }\n}\n\n.row-header {\n    background: #f5f5f5;\n    text-align: left !important;\n    font-weight: bold;\n    border-right: 2px solid #ddd;\n}\n\ntr.expanded {\n    & > td {\n        background-color: #fafafa;\n    }\n}\n\n.header-content {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 8px;\n}\n\n.header-controls {\n    display: flex;\n    align-items: center;\n    gap: 4px;\n}\n\n.column-header {\n    position: relative;\n    \n}\n\n.pivot-table {\n    &.is-dragging {\n        .drop-zone {\n            &.drag-over {\n                .field-item {\n                    pointer-events: none;\n                }\n            }\n        }\n    }\n}\n\n.value-cell {\n    &.drillable {\n        cursor: pointer;\n        position: relative;\n        \n        &:hover {\n            background-color: #f0f7ff;\n            \n            &::after {\n                content: '🔍';\n                position: absolute;\n                top: 2px;\n                right: 2px;\n                font-size: 10px;\n            }\n        }\n    }\n}\n\n.drill-modal-backdrop {\n    position: fixed;\n    top: 0;\n    left: 0;\n    right: 0;\n    bottom: 0;\n    background: rgba(0, 0, 0, 0.5);\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    z-index: 1000;\n}\n\n.drill-modal {\n    background: var(--st-dashboard-bg-1);\n    color: var(--st-text-1);\n    border-radius: 8px;\n    width: 90%;\n    max-width: 1200px;\n    max-height: 90vh;\n    display: flex;\n    flex-direction: column;\n    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);\n    \n    .drill-modal-header {\n        padding: 16px;\n        border-bottom: 1px solid #eee;\n        display: flex;\n        justify-content: space-between;\n        align-items: center;\n        \n        h3 {\n            margin: 0;\n            font-size: 18px;\n            color: var(--st-text-1);\n        }\n        \n        .close-btn {\n            background: none;\n            border: none;\n            font-size: 24px;\n            cursor: pointer;\n            color: #666;\n            \n            &:hover {\n                color: var(--st-text-1);\n            }\n        }\n    }\n    \n    .drill-modal-body {\n        padding: 16px;\n        overflow: auto;\n        \n        table {\n            width: 100%;\n            border-collapse: collapse;\n            \n            th, td {\n                padding: 8px;\n                border: 1px solid var(--st-pivottable-col-headers-border);\n                text-align: left;\n            }\n            \n            th {\n                background: var(--st-dashboard-bg-2);\n                font-weight: 600;\n            }\n            \n            tr:nth-child(even) {\n                background: #f9f9f9;\n            }\n            \n            tr:hover {\n                background: #f0f7ff;\n            }\n        }\n    }\n}\n\n.no-results {\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    min-height: 200px;\n    font-size: 14px;\n    background: color-mix(in srgb, var(--st-text-1) 15%, transparent);\n    color: var(--st-text-1);\n    border: 1px solid var(--st-color-neutral);\n    \n    padding: 1rem;\n    margin: 1rem;\n    border-radius: 4px;\n}\n\n.filter-type-toggle {\n    margin: 5px 0;\n}\n\n.toggle-btn {\n    padding: 4px 8px;\n    border: 1px solid #ddd;\n    background: #f5f5f5;\n    cursor: pointer;\n    border-radius: 4px;\n}\n\n.toggle-btn.active {\n    background: #e0e0e0;\n    border-color: #ccc;\n}\n\n.values-filter {\n    margin-top: 8px;\n    border: 1px solid #ddd;\n    border-radius: 4px;\n}\n\n.values-list {\n    max-height: 200px;\n    overflow-y: auto;\n}\n\n.values-list-header {\n    padding: 8px;\n    border-bottom: 1px solid #ddd;\n    background: #f5f5f5;\n}\n\n.values-search {\n    width: 100%;\n    padding: 4px;\n    margin-bottom: 8px;\n}\n\n.values-actions {\n    display: flex;\n    gap: 8px;\n}\n\n.values-actions button {\n    padding: 2px 6px;\n    font-size: 12px;\n}\n\n.values-options {\n    padding: 8px;\n}\n\n.value-option {\n    display: flex;\n    align-items: center;\n    gap: 8px;\n    padding: 4px 0;\n    cursor: pointer;\n}\n\n.value-option:hover {\n    background: #f5f5f5;\n}\n\n.field-header {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    margin-bottom: 8px;\n}\n\n.field-name {\n    font-weight: 500;\n}\n\n.value-label {\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n}\n\n.values-filter {\n    margin-top: 8px;\n    border: 1px solid #ddd;\n    border-radius: 4px;\n    background: white;\n}\n\n.values-list {\n    max-height: 200px;\n    overflow-y: auto;\n}\n\n.values-list-header {\n    position: sticky;\n    top: 0;\n    padding: 8px;\n    border-bottom: 1px solid #ddd;\n    background: #f5f5f5;\n    z-index: 1;\n}\n\n.values-search {\n    width: 100%;\n    padding: 6px;\n    border: 1px solid #ddd;\n    border-radius: 4px;\n    margin-bottom: 8px;\n}\n\n.values-actions {\n    display: flex;\n    gap: 8px;\n}\n\n.values-actions button {\n    padding: 4px 8px;\n    font-size: 12px;\n    border: 1px solid #ddd;\n    border-radius: 4px;\n    background: white;\n    cursor: pointer;\n}\n\n.values-actions button:hover {\n    background: #f0f0f0;\n}\n\n.values-options {\n    padding: 8px;\n}\n\n.value-option {\n    display: flex;\n    align-items: center;\n    gap: 8px;\n    padding: 6px 8px;\n    cursor: pointer;\n    border-radius: 4px;\n}\n\n.value-option:hover {\n    background: #f5f5f5;\n}\n\n.value-option input[type=\"checkbox\"] {\n    margin: 0;\n}\n\n.no-results.error {\n  color: #dc3545;\n  background-color: #fff3f3;\n  border: 1px solid #ffcdd2;\n}\n\n.no-results.error ul {\n  margin: 0.5rem 0;\n  padding-left: 2rem;\n}\n\n.loading-state {\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    justify-content: center;\n    min-height: 200px;\n    color: var(--st-text-1);\n    background: color-mix(in srgb, var(--st-text-1) 5%, transparent);\n    padding: 2rem;\n    margin: 1rem;\n    border-radius: 8px;\n    gap: 1rem;\n}\n\n.loading-spinner {\n    width: 40px;\n    height: 40px;\n    border: 3px solid var(--st-color-neutral);\n    border-top-color: var(--st-text-1);\n    border-radius: 50%;\n    animation: spin 1s linear infinite;\n}\n\n.fade-in{\n    animation: fadeIn 0.5s ease-in-out;\n}\n\n@keyframes fadeIn {\n    from {\n        opacity: 0;\n    }\n    to {\n        opacity: 1;\n    }\n}\n\n@keyframes spin {\n    to {\n        transform: rotate(360deg);\n    }\n}\n</style>"]}, media: undefined });

    };
    /* scoped */
    const __vue_scope_id__ = "data-v-0996f7d4";
    /* module identifier */
    const __vue_module_identifier__ = undefined;
    /* functional template */
    const __vue_is_functional_template__ = false;
    /* style inject SSR */
    
    /* style inject shadow dom */
    

    
    const __vue_component__ = /*#__PURE__*/normalizeComponent(
      { render: __vue_render__, staticRenderFns: __vue_staticRenderFns__ },
      __vue_inject_styles__,
      __vue_script__,
      __vue_scope_id__,
      __vue_is_functional_template__,
      __vue_module_identifier__,
      false,
      createInjector,
      undefined,
      undefined
    );

  // Install the plugin
  const install = Vue => {
    if (install.installed) return;
    install.installed = true;
    Vue.component('st-pivottable', __vue_component__);
  };
  const plugin = {
    install
  };

  // Auto-install when vue is found (eg. in browser via <script> tag)
  let GlobalVue = null;
  if (typeof window !== 'undefined') {
    GlobalVue = window.Vue;
  } else if (typeof global !== 'undefined') {
    GlobalVue = global.Vue;
  }
  if (GlobalVue) {
    GlobalVue.use(plugin);
  }

  return __vue_component__;

}));
