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
       @out pivot_rows = ["sex", "smoker"]
    @out pivot_cols = ["day", "time"]
    @out pivot_vals = ["tip", "total_bill"]
     @out dataset_tips = [
        ["row","total_bill","tip","sex","smoker","day","time","size"],
        ["1",16.99,1.01,"Female","No","Sun","Dinner",2],
        ["2",10.34,1.66,"Male","No","Sun","Dinner",3],
        ["3",21.01,3.5,"Male","No","Sun","Dinner",3],
        ["4",23.68,3.31,"Male","No","Sun","Dinner",2],
        ["5",24.59,3.61,"Female","No","Sun","Dinner",4],
        ["6",25.29,4.71,"Male","No","Sun","Dinner",4],
        ["7",8.77,2,"Male","No","Sun","Dinner",2],
        ["8",26.88,3.12,"Male","No","Sun","Dinner",4],
        ["9",15.04,1.96,"Male","No","Sun","Dinner",2],
        ["10",14.78,3.23,"Male","No","Sun","Dinner",2],
        ["11",10.27,1.71,"Male","No","Sun","Dinner",2],
        ["12",35.26,5,"Female","No","Sun","Dinner",4],
        ["13",15.42,1.57,"Male","No","Sun","Dinner",2],
        ["14",18.43,3,"Male","No","Sun","Dinner",4],
        ["15",14.83,3.02,"Female","No","Sun","Dinner",2],
        ["16",21.58,3.92,"Male","No","Sun","Dinner",2]]
end

ui() ="""
<st-pivottable :dataset="dataset_tips" :cols="pivot_cols" :rows="pivot_rows" :vals="pivot_vals"></st-pivottable>
""" 

@page("/", ui)

