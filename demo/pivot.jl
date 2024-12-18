module App
using GenieFramework
@genietools
using StipplePivotTable, DataFrames, JSON3

# Load and parse source data
json_file = "data/Employee_Sample_Data.json"
json_string = read(json_file, String)
data = JSON3.read(json_string)

# create a DataFrame
dataframe = DataFrame(data)


@app begin
    # Configure the pivot table properties
    @in rows = [
        Dict(:field => "Business Unit", :sortBy => "label", :sortOrder => "asc"),
        Dict(:field => "Department", :sortBy => "label", :sortOrder => "desc")
    ]
    @in columns = [
        Dict(:field => "Gender", :sortBy => "label", :sortOrder => "desc"),
        Dict(:field => "Ethnicity", :sortBy => "label", :sortOrder => "asc")
    ]
    @in values = [
        Dict(:field => "Annual Salary", :aggregation => "sum" ), 
        Dict(:field => "Annual Salary", :aggregation => "custom", :formula => " {Annual Salary} * 0.01 " )
    ]

    @in filters = [
        Dict(:column => "Annual Salary", :filterType => "condition", :condition => "greaterThan", :value => 220000), 
        Dict(:column => "Country", :filterType => "values", :condition => "contains", :selectedValues => ["China", "Brazil"] )
    ]

    # expose data binding
    @out dataframe = dataframe
end

# serve the app
@page("/", "app.jl.html")
end
