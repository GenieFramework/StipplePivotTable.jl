module StipplePivotTable

using Stipple, StippleUI.API, Stipple.ReactiveTools
import Tables as TablesInterface

export pivottable, Cell, Value, Filter, PivotTableOptions, PivotTable

const assets_config = Genie.Assets.AssetsConfig(package="StipplePivotTable.jl")

import Stipple.Genie.Renderer.Html: register_normal_element, normal_element

register_normal_element("st__pivottable", context=@__MODULE__)

const AGGREGATIONS = [:sum]
const FILTER_TYPES = [:condition, :values]
const CONDITIONS = [:greaterThan, :lessThan, :greaterThanOrEqualTo, :lessThanOrEqualTo, :equalTo, :notEqualTo, :contains, :notContains, :startsWith, :endsWith]


"""
    Cell

A mutable struct representing a cell in a pivot table.

# Fields
- `field::Union{String, Symbol}`: The field associated with the cell.
- `sort_by::Union{String, Symbol}`: The criterion by which the cell is sorted. Defaults to `"label"`.
- `order::Union{String, Symbol}`: The order of sorting. Can be `"asc"` for ascending or `"desc"` for descending. Defaults to `"asc"`.
- `label::Union{String, Symbol}`: The label of the cell. Defaults to the value of `field`.

# Constructors
- `Cell(field::Union{String, Symbol}; kwargs...)`: Create a new `Cell` instance with the specified `field` and optional keyword arguments for `sort_by`, `order`, and `label`.
"""
@kwdef mutable struct Cell
    field::Union{String, Symbol}
    sort_by::Union{String, Symbol} = "label"
    order::Union{String, Symbol} = "asc"
    label::Union{String, Symbol} = field
end
Cell(field::Union{String, Symbol}; kwargs...) = Cell(; field, kwargs...)


"""
    Stipple.render(cell::Cell) -> Dict

Render a `Cell` object into a `Dict` with the following keys:
- `:field` : The field of the cell.
- `:sortBy` : The sorting criteria of the cell.
- `:sortOrder` : The order of sorting (ascending/descending).
- `:label` : The label of the cell.

# Arguments
- `cell::Cell`: The cell to be rendered.

# Returns
- `Dict`: A dictionary representation of the cell.
"""
function Stipple.render(cell::Cell)
    return Dict(:field => cell.field, :sortBy => cell.sort_by, :sortOrder => cell.order, :label => cell.label)
end


"""
    Stipple.render(cells::Vector{Cell}) -> Vector{Dict}

Render a vector of `Cell` objects into a vector of `Dict` objects.

# Arguments
- `cells::Vector{Cell}`: A vector of cells to be rendered.

# Returns
- `Vector{Dict}`: A vector of dictionary representations of the cells.
"""
Stipple.render(cells::Vector{Cell}) = Stipple.render([Stipple.render(cell) for cell in cells])


"""
    Value

A mutable struct representing a value in a pivot table.

# Fields
- `field::Union{String, Symbol}`: The field name associated with the value.
- `aggregation::Union{String, Symbol}`: The aggregation method to be applied to the field.
- `formula::Union{String, Symbol, Nothing}`: An optional formula for calculating the value. Defaults to `nothing`.
- `label::Union{String, Symbol}`: A label for the value. Defaults to the value of `field`.
"""
@kwdef mutable struct Value
    field::Union{String, Symbol}
    aggregation::Union{String, Symbol}
    formula::Union{String, Symbol, Nothing} = nothing
    label::Union{String, Symbol} = field
end


"""
    Value(field::Union{String, Symbol}; kwargs...)

Constructs a `Value` object with the specified `field` and additional keyword arguments.

# Arguments
- `field::Union{String, Symbol}`: The field name for the `Value` object. Can be either a `String` or a `Symbol`.
- `kwargs...`: Additional keyword arguments to be passed to the `Value` constructor.

# Returns
A `Value` object initialized with the given `field` and keyword arguments.
"""
Value(field::Union{String, Symbol}; kwargs...) = Value(; field, kwargs...)


"""
    Stipple.render(value::Value) -> Dict

Render a `Value` object into a `Dict` representation.

# Arguments
- `value::Value`: The `Value` object to be rendered. It should have the fields `field`, `aggregation`, `label`, and optionally `formula`.

# Returns
- `Dict`: A dictionary containing the `field`, `aggregation`, and `label` from the `Value` object. If `formula` is not `nothing`, it is also included in the dictionary with the formula string.
"""
function Stipple.render(value::Value)
    d = Dict(:field => value.field, :aggregation => value.aggregation, :label => value.label)
    if value.formula !== nothing
        d[:formula] = " $(value.formula) " # this is needed to allow {field} in the formula to be rendered correctly
    end

    return d
end


"""
    Stipple.render(values::Vector{Value}) -> String

Render a vector of `Value` objects using the `Stipple.render` function. This method takes a vector of `Value` objects and applies the `Stipple.render` function to each element in the vector, returning a vector of rendered values.

# Arguments
- `values::Vector{Value}`: A vector of `Value` objects to be rendered.

# Returns
- A vector of rendered values as strings.
"""
Stipple.render(values::Vector{Value}) = Stipple.render([Stipple.render(value) for value in values])


"""
    Filter

A mutable struct representing a filter with various attributes.

# Fields
- `field::Union{String, Symbol}`: The field to which the filter is applied.
- `condition::Union{String, Symbol}`: The condition to be applied on the field.
- `type::Union{String, Symbol, Nothing}`: The type of the filter, default is `nothing`.
- `value::Union{Any, Nothing}`: The value for the filter, default is `nothing`.
- `selected_values::Union{Any, Vector, Nothing}`: The selected values for the filter, default is `nothing`.

# Constructor
- `Filter(field::Union{String, Symbol}; kwargs...)`: Create a `Filter` instance with the specified field and keyword arguments for other attributes.
"""
@kwdef mutable struct Filter
    field::Union{String, Symbol}
    condition::Union{String, Symbol}
    type::Union{String, Symbol, Nothing} = nothing
    value::Union{Any, Nothing} = nothing
    selected_values::Union{Any, Vector, Nothing} = nothing
end
Filter(field::Union{String, Symbol}; kwargs...) = Filter(; field, kwargs...)


"""
    Stipple.render(filter::Filter) -> Dict

Render a `Filter` object into a dictionary representation.

# Arguments
- `filter::Filter`: The filter object to be rendered.

# Returns
- `Dict`: A dictionary containing the following keys:
    - `:field`: The field associated with the filter.
    - `:filterType`: The type of the filter, which can be `:values` or `:condition`.
    - `:condition`: The condition applied by the filter.
    - `:value`: The value used in the filter condition.
    - `:selectedValues`: The selected values for the filter.

# Description
This function determines the type of the filter based on its properties:
- If `filter.type` is `nothing`, `filter.selected_values` is not `nothing`, and `filter.value` is `nothing`, the filter type is set to `:values`.
- If `filter.type` is `nothing`, `filter.selected_values` is `nothing`, and `filter.value` is not `nothing`, the filter type is set to `:condition`.

The function then returns a dictionary representation of the filter with the appropriate keys and values.
"""
function Stipple.render(filter::Filter)
    if filter.type === nothing && filter.selected_values !== nothing && filter.value === nothing
        filter.type = :values
    elseif filter.type === nothing && filter.selected_values === nothing && filter.value !== nothing
        filter.type = :condition
    end

    return Dict(:field => filter.field, :filterType => filter.type, :condition => filter.condition, :value => filter.value,
                :selectedValues => filter.selected_values)
end


"""
    Stipple.render(filters::Vector{Filter}) -> String

Render a vector of `Filter` objects into a single string representation.

# Arguments
- `filters::Vector{Filter}`: A vector containing `Filter` objects to be rendered.

# Returns
- A `String` that is the concatenation of the rendered `Filter` objects.
"""
Stipple.render(filters::Vector{Filter}) = Stipple.render([Stipple.render(filter) for filter in filters])


"""
    PivotTableOptions

A mutable struct that holds options for configuring a pivot table.

# Fields
- `rows::Vector{Cell}`: A vector of `Cell` objects representing the rows of the pivot table. Defaults to an empty vector.
- `columns::Vector{Cell}`: A vector of `Cell` objects representing the columns of the pivot table. Defaults to an empty vector.
- `values::Vector{Value}`: A vector of `Value` objects representing the values in the pivot table. Defaults to an empty vector.
- `filters::Vector{Filter}`: A vector of `Filter` objects representing the filters applied to the pivot table. Defaults to an empty vector.
"""
@kwdef mutable struct PivotTableOptions
    rows::Vector{Cell} = []
    columns::Vector{Cell} = []
    values::Vector{Value} = []
    filters::Vector{Filter} = []
end


"""
    Stipple.render(opts::PivotTableOptions) -> Dict

Render the given `PivotTableOptions` into a dictionary format suitable for Stipple.

# Arguments
- `opts::PivotTableOptions`: The options for the pivot table, including rows, columns, values, and filters.

# Returns
- `Dict`: A dictionary with keys `:rows`, `:columns`, `:values`, and `:filters`, each containing a list of rendered cells, values, or filters.
"""
function Stipple.render(opts::PivotTableOptions)
    return Dict(:rows => [Stipple.render(cell) for cell in opts.rows],
                :columns => [Stipple.render(cell) for cell in opts.columns],
                :values => [Stipple.render(value) for value in opts.values],
                :filters => [Stipple.render(filter) for filter in opts.filters])
end


"""
    PivotTable{T}

A mutable struct that represents a pivot table.

# Fields
- `data::T`: The data to be used in the pivot table.
- `opts::PivotTableOptions`: Options for configuring the pivot table.
"""
@kwdef mutable struct PivotTable{T}
    data::T
    opts::PivotTableOptions
end


"""
    Stipple.render(pt::PivotTable) -> Dict

Render a `PivotTable` object into a dictionary format suitable for use with Stipple.

# Arguments
- `pt::PivotTable`: The `PivotTable` object to be rendered.

# Returns
- `Dict`: A dictionary containing the data and options for the `PivotTable`.

# Details
- If the `rows` option in `pt.opts` is empty, it will be populated with the rows of the `PivotTable`.
- If the `columns` option in `pt.opts` is empty, it will be populated with the columns of the `PivotTable`.
- The function returns a dictionary with two keys:
  - `:data`: The data of the `PivotTable`.
  - `:options`: The rendered options of the `PivotTable`.
"""
function Stipple.render(pt::PivotTable)
    isempty(pt.opts.rows) && (pt.opts.rows = rows(pt))
    isempty(pt.opts.columns) && (pt.opts.columns = columns(pt))

    return Dict(:data => data(pt), :options => Stipple.render(pt.opts))
end


"""
    columns(pivot::PivotTable) :: Vector{Cell}

Returns a vector of `Cell` objects representing the columns of the given `PivotTable`.

# Arguments
- `pivot::PivotTable`: The pivot table for which to retrieve the columns.

# Returns
- `Vector{Cell}`: A vector of `Cell` objects. If `pivot.opts.columns` is not `nothing`, it returns `pivot.opts.columns`. Otherwise, it generates a vector of `Cell` objects using the column names from `pivot.data`.
"""
function columns(pivot::PivotTable) :: Vector{Cell}
    pivot.opts.columns !== nothing ?
        pivot.opts.columns :
            [Cell(field = string(name), label = string(name)) for name in TablesInterface.columnnames(pivot.data)]
end


"""
    columns(data)

Generate a list of `Cell` objects for each column in the given `data`.

# Arguments
- `data`: A table-like object that implements the `TablesInterface`.

# Returns
- An array of `Cell` objects, where each `Cell` has a `field` and `label` corresponding to the column names of the input `data`.
"""
columns(data) = [Cell(field = string(name), label = string(name)) for name in TablesInterface.columnnames(data)]


"""
    columns(names::Vector{String}) -> Vector{Cell}

Generate a vector of `Cell` objects from a vector of column names.

# Arguments
- `names::Vector{String}`: A vector of strings representing the column names.

# Returns
- `Vector{Cell}`: A vector of `Cell` objects, each initialized with a field and label corresponding to a column name.
"""
columns(names::Vector{String}) = [Cell(field = name, label = name) for name in names]


"""
    rows(pivot::PivotTable) :: Vector{Cell}

Returns a vector of `Cell` objects representing the rows of the given `PivotTable`.

# Arguments
- `pivot::PivotTable`: The pivot table for which to retrieve the rows.

# Returns
- `Vector{Cell}`: A vector of `Cell` objects. If `pivot.opts.rows` is not `nothing`, it returns `pivot.opts.rows`. Otherwise, it generates a vector of `Cell` objects from the column names of `pivot.data`.
"""
function rows(pivot::PivotTable) :: Vector{Cell}
    pivot.opts.rows !== nothing ?
        pivot.opts.rows :
            [Cell(field = string(name), label = string(name)) for name in TablesInterface.columnnames(pivot.data)]
end


"""
    rows(data)

Generate a list of `Cell` objects for each column in the given `data`.

# Arguments
- `data`: A table-like object that implements the `TablesInterface`.

# Returns
- A list of `Cell` objects, where each `Cell` represents a column in the `data` with its `field` and `label` set to the column name.
"""
rows(data) = [Cell(field = string(name), label = string(name)) for name in TablesInterface.columnnames(data)]


"""
    rows(names::Vector{String}) -> Vector{Cell}

Generate a vector of `Cell` objects from a vector of strings.

# Arguments
- `names::Vector{String}`: A vector of strings representing the names to be used as fields and labels in the `Cell` objects.

# Returns
- A vector of `Cell` objects, each initialized with a `field` and `label` set to the corresponding string from the input vector.
"""
rows(names::Vector{String}) = [Cell(field = name, label = name) for name in names]


"""
    values(pivot::PivotTable) :: Vector{Value}

Retrieve the values from the given `PivotTable` instance.

# Arguments
- `pivot::PivotTable`: The pivot table from which to extract the values.

# Returns
- `Vector{Value}`: A vector containing the values from the pivot table.
"""
function values(pivot::PivotTable) :: Vector{Value}
    pivot.opts.values
end



"""
    filters(pivot::PivotTable) :: Vector{Filter}

Retrieve the filters from a given `PivotTable` instance.

# Arguments
- `pivot::PivotTable`: The `PivotTable` instance from which to retrieve the filters.

# Returns
- `Vector{Filter}`: A vector containing the filters of the specified `PivotTable`.
"""
function filters(pivot::PivotTable) :: Vector{Filter}
    pivot.opts.filters
end


"""
    data(pivot::PivotTable)

Retrieve the data from a `PivotTable` object.

# Arguments
- `pivot::PivotTable`: The `PivotTable` instance from which to retrieve the data.

# Returns
- A table representation of the data contained in the `PivotTable` object.
"""
function data(pivot::PivotTable)
    TablesInterface.table(pivot.data)
end


"""
    pivottable(pt::PivotTable; columns::Union{Vector{Cell}, Nothing} = nothing,
               rows::Union{Vector{Cell}, Nothing} = nothing,
               values::Union{Vector{Value}, Nothing} = nothing,
               filters::Union{Vector{Filter}, Nothing} = nothing)

Create a pivot table from the given `PivotTable` object `pt`.

# Arguments
- `pt::PivotTable`: The pivot table object containing the data.
- `columns::Union{Vector{Cell}, Nothing}`: Optional. A vector of columns to include in the pivot table. Defaults to `columns(pt)` if not provided.
- `rows::Union{Vector{Cell}, Nothing}`: Optional. A vector of rows to include in the pivot table. Defaults to `rows(pt)` if not provided.
- `values::Union{Vector{Value}, Nothing}`: Optional. A vector of values to include in the pivot table. Defaults to `values(pt)` if not provided.
- `filters::Union{Vector{Filter}, Nothing}`: Optional. A vector of filters to apply to the pivot table. Defaults to `filters(pt)` if not provided.

# Returns
- A pivot table created using the specified columns, rows, values, and filters.
"""
function pivottable(pt::PivotTable; columns::Union{Vector{Cell}, Nothing} = nothing,
                                    rows::Union{Vector{Cell}, Nothing} = nothing,
                                    values::Union{Vector{Value}, Nothing} = nothing,
                                    filters::Union{Vector{Filter}, Nothing} = nothing)
    columns = columns !== nothing ? columns : columns(pt)
    rows = rows !== nothing ? rows : rows(pt)
    values = values !== nothing ? values : values(pt)
    filters = filters !== nothing ? filters : filters(pt)

    return st__pivottable(data = pt.data; columns, rows, values, filters)
end

# doesn't work yet due to Stipple bug
# macro pivotvars(varname)
#     # Generate the required expressions
#     quote
#         @out $(esc(varname))_rows = $(esc(varname)).opts.rows
#         @out $(esc(varname))_columns = $(esc(varname)).opts.columns
#         @out $(esc(varname))_values = $(esc(varname)).opts.values
#         @out $(esc(varname))_filters = $(esc(varname)).opts.filters
#         @out $(esc(varname))_data = $(esc(varname)).data
#     end
# end


"""
    pivottable(; kwargs...)

Creates a pivot table with the given keyword arguments.

# Arguments
- `kwargs...`: A variable number of keyword arguments to customize the pivot table.

# Returns
- The created pivot table.
"""
function pivottable(; kwargs...)
    st_pivottable(; kw([kwargs...])...)
end

#================================================================================#
#=========================== PRIVATE -- Genie integration =======================#

function gb_component_routes()
    package_subpath_part = "stipplepivottable" # change these, keep the other parts as defined below

    # don't change these
    # GenieDevTools identifies the components by their asset path, which must be of the form /components/stipplemarkdown/gb_component/
    prefix = "components"
    gb_component_path = "gb_component"
    assets_folder_path = "$package_subpath_part/$gb_component_path"
    icons_folder_path = "icons"

    [
    Genie.Router.route(Genie.Assets.asset_route(
        assets_config,
        "", # type
        file="definitions.json",
        path=assets_folder_path,
        prefix=prefix,
        ext=""
    ),
    named=:get_gb_component_stipplepivottable_definitionsjson) do
        Genie.Renderer.WebRenderable(
            Genie.Assets.embedded(
                Genie.Assets.asset_file(cwd=normpath(joinpath(@__DIR__, "..")),
                file="definitions.json",
                path=gb_component_path,
                type="")
            ),
            :json) |> Genie.Renderer.respond
    end

    Genie.Router.route(Genie.Assets.asset_route(
        assets_config,
        "", # type
        file="canvas.css",
        path=assets_folder_path,
        prefix=prefix,
        ext=""
    ),
    named=:get_gb_component_stipplepivottable_canvascss) do
        Genie.Renderer.WebRenderable(
            Genie.Assets.embedded(
                Genie.Assets.asset_file(cwd=normpath(joinpath(@__DIR__, "..")),
                file="canvas.css",
                path=gb_component_path,
                type="")
            ),
            :css) |> Genie.Renderer.respond
    end

    Genie.Router.route(Genie.Assets.asset_route(
        assets_config,
        "", # type
        file="stipplepivottable.png",
        path="$assets_folder_path/$icons_folder_path",
        prefix=prefix,
        ext=""
    ),

    named=:get_gb_component_stipplepivottable_icons_stipplepivottable) do
        Genie.Renderer.WebRenderable(
            Genie.Assets.embedded(
                Genie.Assets.asset_file(cwd=normpath(joinpath(@__DIR__, "..")),
                file="stipplepivottable.png",
                path=joinpath(gb_component_path, icons_folder_path),
                type="")
            ),
            :png) |> Genie.Renderer.respond
    end
    ]
end

#================================================================================#
# =========================== DEPENDENCIES AND ASSETS ===========================#
function deps_routes()
    haskey(ENV, "GB_JULIA_PATH") && gb_component_routes()

    Genie.Assets.external_assets(Stipple.assets_config) && return nothing

    Genie.Router.route(Genie.Assets.asset_route(assets_config, :js, file="10_stipplepivottable"), named=:get_stipplepivottablejs) do
        Genie.Renderer.WebRenderable(
            Genie.Assets.embedded(Genie.Assets.asset_file(cwd=normpath(joinpath(@__DIR__, "..")), file="10_stipplepivottable.js")),
            :javascript) |> Genie.Renderer.respond
    end


    Genie.Router.route(Genie.Assets.asset_route(assets_config, :css, file="pivot.min"), named=:get_pivotmincss) do
        Genie.Renderer.WebRenderable(
            Genie.Assets.embedded(Genie.Assets.asset_file(cwd=normpath(joinpath(@__DIR__, "..")), type="css", file="pivot.min.css")),
            :css) |> Genie.Renderer.respond
    end

    nothing
end

function css_deps()
    [
        Stipple.Elements.stylesheet(Genie.Assets.asset_path(assets_config, :css, file="pivot.min"))
    ]
end

function deps()
    [
        Genie.Renderer.Html.script(src=Genie.Assets.asset_path(assets_config, :js, file="10_stipplepivottable")),
    ]
end

function __init__()
    deps_routes()
    Stipple.add_css(css_deps)
    Stipple.deps!(@__MODULE__, deps)
end

end
