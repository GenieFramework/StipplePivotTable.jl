module StipplePivotTable

using Stipple, StippleUI.API

export pivottable

const assets_config = Genie.Assets.AssetsConfig(package="StipplePivotTable.jl")

import Stipple.Genie.Renderer.Html: register_normal_element, normal_element

register_normal_element("st__pivottable", context=@__MODULE__)


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

    Genie.Router.route(Genie.Assets.asset_route(assets_config, :js, file="01_jquery"), named=:get_jqueryjs) do
        Genie.Renderer.WebRenderable(
            Genie.Assets.embedded(Genie.Assets.asset_file(cwd=normpath(joinpath(@__DIR__, "..")), file="01_jquery.js")),
            :javascript) |> Genie.Renderer.respond
    end

    Genie.Router.route(Genie.Assets.asset_route(assets_config, :js, file="02_jquery-ui.min"), named=:get_jqueryuijs) do
        Genie.Renderer.WebRenderable(
            Genie.Assets.embedded(Genie.Assets.asset_file(cwd=normpath(joinpath(@__DIR__, "..")), file="02_jquery-ui.min.js")),
            :javascript) |> Genie.Renderer.respond
    end

    Genie.Router.route(Genie.Assets.asset_route(assets_config, :js, file="03_jquery.ui.touch-punch.min"), named=:get_jqueryuitouchpunchmin) do
        Genie.Renderer.WebRenderable(
            Genie.Assets.embedded(Genie.Assets.asset_file(cwd=normpath(joinpath(@__DIR__, "..")), file="03_jquery.ui.touch-punch.min.js")),
            :javascript) |> Genie.Renderer.respond
    end

    Genie.Router.route(Genie.Assets.asset_route(assets_config, :js, file="04_pivot.min"), named=:get_pivotminjs) do
        Genie.Renderer.WebRenderable(
            Genie.Assets.embedded(Genie.Assets.asset_file(cwd=normpath(joinpath(@__DIR__, "..")), file="04_pivot.min.js")),
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
        Genie.Renderer.Html.script(src=Genie.Assets.asset_path(assets_config, :js, file="01_jquery")),
        Genie.Renderer.Html.script(src=Genie.Assets.asset_path(assets_config, :js, file="02_jquery-ui.min")),
        Genie.Renderer.Html.script(src=Genie.Assets.asset_path(assets_config, :js, file="03_jquery.ui.touch-punch.min")),
        Genie.Renderer.Html.script(src=Genie.Assets.asset_path(assets_config, :js, file="04_pivot.min")),
        Genie.Renderer.Html.script(src=Genie.Assets.asset_path(assets_config, :js, file="10_stipplepivottable")),
    ]
end

function __init__()
    deps_routes()
    Stipple.add_css(css_deps)
    Stipple.deps!(@__MODULE__, deps)
end

end
