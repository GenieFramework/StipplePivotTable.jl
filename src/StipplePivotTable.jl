module StipplePivotTable

using Stipple, StippleUI.API
import Tables as TablesInterface

export pivottable

const assets_config = Genie.Assets.AssetsConfig(package="StipplePivotTable.jl")

import Stipple.Genie.Renderer.Html: register_normal_element, normal_element

register_normal_element("st__pivottable", context=@__MODULE__)

const AGGREGATIONS = [:sum]
const FILTER_TYPES = [:condition, :values]
const CONDITIONS = [:greaterThan, :lessThan, :greaterThanOrEqualTo, :lessThanOrEqualTo, :equalTo, :notEqualTo, :contains, :notContains, :startsWith, :endsWith]

@kwdef mutable struct Cell
    field::Union{String, Symbol}
    sort_by::Union{String, Symbol} = "label"
    sort_order::Union{String, Symbol} = "asc"
    label::Union{String, Symbol, Nothing} = nothing
end

@kwdef mutable struct Value
    field::Union{String, Symbol}
    aggregation::Union{String, Symbol}
    formula::Union{String, Symbol, Nothing} = nothing
end

@kwdef mutable struct Filter
    column::Union{String, Symbol, Nothing} = nothing
    row::Union{String, Symbol, Nothing} = nothing
    type::Union{String, Symbol}
    condition::Union{String, Symbol}
    value::Union{String, Symbol, Nothing} = nothing
    selected_values::Union{Vector{String}, Nothing} = nothing
end

@kwdef mutable struct PivotTableOptions
    rows::Vector{Cell}
    columns::Vector{Cell}
    values::Vector{Value}
    filters::Vector{Filter}
end

@kwdef mutable struct PivotTable{T}
    data::T
    opts::PivotTableOptions
end


function pivottable(;kwargs...)
    st_pivottable(;kw([kwargs...])...)
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
