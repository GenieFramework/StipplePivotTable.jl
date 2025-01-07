module App
using GenieFramework
@genietools
using StipplePivotTable; const spt = StipplePivotTable
using DataFrames, JSON3

# Load and parse source data
json_file = "data/Employee_Sample_Data.json"
json_string = read(json_file, String)
data = JSON3.read(json_string)

# StipplePivotTable.Cell("EEID", "label", "asc", "EEID")
# StipplePivotTable.Cell("Full Name", "label", "asc", "Full Name")
# StipplePivotTable.Cell("Job Title", "label", "asc", "Job Title")
# StipplePivotTable.Cell("Department", "label", "asc", "Department")
# StipplePivotTable.Cell("Business Unit", "label", "asc", "Business Unit")
# StipplePivotTable.Cell("Gender", "label", "asc", "Gender")
# StipplePivotTable.Cell("Ethnicity", "label", "asc", "Ethnicity")
# StipplePivotTable.Cell("Age", "label", "asc", "Age")
# StipplePivotTable.Cell("Hire Date", "label", "asc", "Hire Date")
# StipplePivotTable.Cell("Annual Salary", "label", "asc", "Annual Salary")
# StipplePivotTable.Cell("Bonus", "label", "asc", "Bonus")
# StipplePivotTable.Cell("Country", "label", "asc", "Country")
# StipplePivotTable.Cell("City", "label", "asc", "City")
# StipplePivotTable.Cell("Exit Date", "label", "asc", "Exit Date")

# create a pivot table
pt = PivotTable(
    DataFrame(data),
    PivotTableOptions(
        # rows = [
        #     # Cell("Business Unit"),
        #     # Cell("Department", order = :desc)

        #     Cell("Business Unit", "label", "asc", "Business Unit"),
        #     Cell("Department", "label", "asc", "Department")
        # ],
        # columns = [
        #     # Cell("Gender", order = :desc),
        #     # Cell("Ethnicity")

        #     Cell("Gender", "label", "asc", "Gender"),
        #     Cell("Ethnicity", "label", "asc", "Ethnicity")
        # ],
        rows = spt.rows(["Business Unit", "Department"]),
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
    @out rows = pt.opts.rows
    @out columns = pt.opts.columns
    @out values = pt.opts.values
    @out filters = pt.opts.filters
    @out data = pt.data
end

# serve the app
@page("/", "app.jl.html")
end
