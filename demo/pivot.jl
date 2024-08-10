using GenieFramework
@genietools
using StipplePivotTable, DataFrames

df = DataFrame(
    ID = 1:20,
    Department = repeat(["Sales", "Marketing", "IT", "HR"], 5),
    Employee = ["Emp" * string(i) for i in 1:20],
    Salary = rand(50000:5000:100000, 20),
    Sales = rand(50000:5000:100000, 20),
    HireDate = Date(2020,1,1) .+ Day.(rand(1:1000, 20)),
    Performance = rand(["Excellent", "Good", "Average", "Poor"], 20)
)
@app begin
    @out table = DataTable(df)
end

ui() ="""
<st-pivottable ></st-pivottable>
""" 

@page("/", ui)

