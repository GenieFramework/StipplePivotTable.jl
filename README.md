# StipplePivotTable

This component renders a configurable Pivot Table featuring aggregations, filters and row/column sorting

## How to use

The component accepts the following properties:

### data

The data source for the pivot table. Expected format is a DataFrame

Example:

```
json_string = read(json_file, String)
raw_data = JSON3.read(json_string)
dataframe = DataFrame(raw_data)     # Use this variable for the component's "data" property
```


### rows

A list of objects defining the rows aggregation hierarchy. Each object should include the following properties:

- field: Name of the data source field
- sortBy: Criteria to perform sorting. Accepted values are "label" (to sort alphabetically) or name of one of the rendered values, i.e. "Annual Salary (sum)"
- sortOrder: Order of sorting. Accepted values: "asc", "desc"

Example:

```
[
    Dict(:field => "Business Unit", :sortBy => "label", :sortOrder => "asc"),
    Dict(:field => "Department", :sortBy => "label", :sortOrder => "desc")
]
```

### columns

A list of objects defining the columns aggregation hierarchy. Each object should include the following properties:

- field: Name of the data source field
- sortBy: Criteria to perform sorting. Accepted values are "label" (to sort alphabetically) or name of one of the rendered values, i.e. "Annual Salary (sum)"
- sortOrder: Order of sorting. Accepted values: "asc", "desc"

Example:

```
[
    Dict(:field => "Gender", :sortBy => "label", :sortOrder => "desc"),
    Dict(:field => "Ethnicity", :sortBy => "label", :sortOrder => "asc")
]
```


### values

A list of objects defining the values to include in the table's grid. Each object should include the following properties:

- field: Name of the data source field
- aggregation: Name of the function to calculate the aggregation.
- formula: If "aggregation"'s value is set to "custom", an additional property "formula" should be provided as a string. Fields in the data source can be referenced using curly braces, i.e: {Annual Salary} * 0.01

Optionally, you can include a "label" property to show a custom field name


Example:

```
[
    Dict(:field => "Annual Salary", :aggregation => "sum" ), 
    Dict(:field => "Annual Salary", :aggregation => "custom", :formula => " {Annual Salary} * 0.21 ", :label => "Tax" )
]
```

#### Supported Aggregation Functions

- sum
- count
- counta
- countunique
- avg
- average
- max
- min
- median
- stdev
- stdevp
- var
- varp
- custom

### filters

A list of objects defining the filters to be applied to exclude rows. Each object should include the following properties:

- column: Name of the data source field to filter by
- filterType: There are two modalities of filters, "by Condition" and "by Values". Accepted values: "condition" and "values"

#### Additinal properties for "by Condition" filters:

- condition: Operator for the condition. Accepted values: equals, notEquals, greaterThan, greaterThanOrEqual, lessThan, lessThanOrEqual, contains, notContains, startsWith, endsWith, isEmpty, isNotEmpty
- value: Value to be used in the condition statement


#### Additinal properties for "by Values" filters:

- condition: Operator for the condition. Accepted value: contains (other values may be accepted in future versions)
- selectedValues: List of values that will pass the filter

Example:

```
[
    Dict(:column => "Annual Salary", :filterType => "condition", :condition => "greaterThan", :value => 220000), 
    Dict(:column => "Country", :filterType => "values", :condition => "contains", :selectedValues => ["China", "Brazil"] )
]
```