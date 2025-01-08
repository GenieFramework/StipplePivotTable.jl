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

@kwdef mutable struct Cell
    field::Union{String, Symbol}
    sort_by::Union{String, Symbol} = "label"
    order::Union{String, Symbol} = "asc"
    label::Union{String, Symbol} = field
end
Cell(field::Union{String, Symbol}; kwargs...) = Cell(; field, kwargs...)

function Stipple.render(cell::Cell)
    return Dict(:field => cell.field, :sortBy => cell.sort_by, :sortOrder => cell.order, :label => cell.label)
end
Stipple.render(cells::Vector{Cell}) = Stipple.render([Stipple.render(cell) for cell in cells])

@kwdef mutable struct Value
    field::Union{String, Symbol}
    aggregation::Union{String, Symbol}
    formula::Union{String, Symbol, Nothing} = nothing
end
Value(field::Union{String, Symbol}; kwargs...) = Value(; field, kwargs...)

function Stipple.render(value::Value)
    d = Dict(:field => value.field, :aggregation => value.aggregation)
    if value.formula !== nothing
        d[:formula] = " $(value.formula) " # this is needed to allow {field} in the formula to be rendered correctly
    end

    return d
end
Stipple.render(values::Vector{Value}) = Stipple.render([Stipple.render(value) for value in values])

@kwdef mutable struct Filter
    field::Union{String, Symbol}
    condition::Union{String, Symbol}
    type::Union{String, Symbol, Nothing} = nothing
    value::Union{Any, Nothing} = nothing
    selected_values::Union{Any, Vector, Nothing} = nothing
end
Filter(field::Union{String, Symbol}; kwargs...) = Filter(; field, kwargs...)

function Stipple.render(filter::Filter)
    if filter.type === nothing && filter.selected_values !== nothing && filter.value === nothing
        filter.type = :values
    elseif filter.type === nothing && filter.selected_values === nothing && filter.value !== nothing
        filter.type = :condition
    end

    return Dict(:field => filter.field, :filterType => filter.type, :condition => filter.condition, :value => filter.value, :selectedValues => filter.selected_values)
end
Stipple.render(filters::Vector{Filter}) = Stipple.render([Stipple.render(filter) for filter in filters])

@kwdef mutable struct PivotTableOptions
    rows::Vector{Cell} = []
    columns::Vector{Cell} = []
    values::Vector{Value} = []
    filters::Vector{Filter} = []
end

function Stipple.render(opts::PivotTableOptions)
    return Dict(:rows => [Stipple.render(cell) for cell in opts.rows],
                :columns => [Stipple.render(cell) for cell in opts.columns],
                :values => [Stipple.render(value) for value in opts.values],
                :filters => [Stipple.render(filter) for filter in opts.filters])
end

@kwdef mutable struct PivotTable{T}
    data::T
    opts::PivotTableOptions
end

function Stipple.render(pt::PivotTable)
    isempty(pt.opts.rows) && (pt.opts.rows = rows(pt))
    isempty(pt.opts.columns) && (pt.opts.columns = columns(pt))

    return Dict(:data => data(pt), :options => Stipple.render(pt.opts))
end

function columns(pivot::PivotTable) :: Vector{Cell}
    pivot.opts.columns !== nothing ?
        pivot.opts.columns :
            [Cell(field = string(name), label = string(name)) for name in TablesInterface.columnnames(pivot.data)]
end
columns(data) = [Cell(field = string(name), label = string(name)) for name in TablesInterface.columnnames(data)]
columns(names::Vector{String}) = [Cell(field = name, label = name) for name in names]

function rows(pivot::PivotTable) :: Vector{Cell}
    pivot.opts.rows !== nothing ?
        pivot.opts.rows :
            [Cell(field = string(name), label = string(name)) for name in TablesInterface.columnnames(pivot.data)]
end
rows(data) = [Cell(field = string(name), label = string(name)) for name in TablesInterface.columnnames(data)]
rows(names::Vector{String}) = [Cell(field = name, label = name) for name in names]

function values(pivot::PivotTable) :: Vector{Value}
    pivot.opts.values
end

function filters(pivot::PivotTable) :: Vector{Filter}
    pivot.opts.filters
end

function data(pivot::PivotTable)
    TablesInterface.table(pivot.data)
end

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

function pivottable(; kwargs...)
    st_pivottable(; kw([kwargs...])...)
end

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
