module App
using GenieFramework
@genietools
using StipplePivotTable; const spt = StipplePivotTable
using DataFrames, JSON3

# Load and parse source data
json_file = "data/Employee_Sample_Data.json"
df = JSON3.read(read(json_file, String)) |> DataFrame

# create a pivot table
pt = PivotTable(
    df,
    PivotTableOptions(
        rows = spt.rows(["Country", "Department"]),
        columns = spt.columns(["Gender", "Ethnicity"]),
        values = [
            Value("Annual Salary", aggregation = "sum"),
            Value("Annual Salary", aggregation = "custom", formula = "{Annual Salary} * 0.02")
        ],
        filters = [
            Filter("Annual Salary", type = "condition", condition = "greaterThan", value = 220000),
            Filter("Country", type = "values", condition = "contains", selected_values = ["China", "Brazil"])
        ]
    )
)

@app begin
    # @out rows = pt.opts.rows
    # @out columns = pt.opts.columns
    # @out values = pt.opts.values
    # @out filters = pt.opts.filters
    # @out data = pt.data

    @out pt = pt
end

ui() = [
    h1("Pivot Table Low-code", class="st-module")

    # Table section
    section(class="table-container st-module", [
        pivottable(:pt)  # Bind the pivot table from the model
    ])
]

# @page("/", "app.jl.html")
@page("/", ui)

end
