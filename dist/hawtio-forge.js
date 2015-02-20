/// <reference path="../libs/hawtio-forms/defs.d.ts"/>
/// <reference path="../libs/hawtio-ui/defs.d.ts"/>
/// <reference path="../libs/hawtio-utilities/defs.d.ts"/>
/// <reference path="../libs/hawtio-wiki/defs.d.ts"/>

// <reference path="../../includes.ts"/>
var Forge;
(function (Forge) {
    Forge.context = '/forge';
    Forge.hash = '#' + Forge.context;
    Forge.defaultRoute = Forge.hash + '/projects';
    Forge.pluginName = 'Forge';
    Forge.pluginPath = 'plugins/forge/';
    Forge.templatePath = Forge.pluginPath + 'html/';
    Forge.log = Logger.get(Forge.pluginName);
    Forge.defaultIconUrl = Core.url("/img/forge.svg");
    function isForge(workspace) {
        return true;
    }
    Forge.isForge = isForge;
    function commandLink(name, resourcePath) {
        if (name) {
            if (resourcePath) {
                return UrlHelpers.join("/forge/command", name, resourcePath);
            }
            else {
                return UrlHelpers.join("/forge/command/", name);
            }
        }
        return null;
    }
    Forge.commandLink = commandLink;
    function commandsLink(resourcePath) {
        if (resourcePath) {
            return UrlHelpers.join("/forge/commands", resourcePath);
        }
        else {
            return "/forge/commands";
        }
    }
    Forge.commandsLink = commandsLink;
    function projectsApiUrl(ForgeApiURL) {
        return UrlHelpers.join(ForgeApiURL, "/projects");
    }
    Forge.projectsApiUrl = projectsApiUrl;
    function projectApiUrl(ForgeApiURL, path) {
        return UrlHelpers.join(ForgeApiURL, "/projects", path);
    }
    Forge.projectApiUrl = projectApiUrl;
    /**
     * Returns the project for the given resource path
     */
    function modelProject(ForgeModel, resourcePath) {
        if (resourcePath) {
            var project = ForgeModel.projects[resourcePath];
            if (!project) {
                project = {};
                ForgeModel.projects[resourcePath] = project;
            }
            return project;
        }
        else {
            return ForgeModel.rootProject;
        }
    }
    function setModelCommands(ForgeModel, resourcePath, commands) {
        var project = modelProject(ForgeModel, resourcePath);
        project.$commands = commands;
    }
    Forge.setModelCommands = setModelCommands;
    function getModelCommands(ForgeModel, resourcePath) {
        var project = modelProject(ForgeModel, resourcePath);
        return project.$commands || [];
    }
    Forge.getModelCommands = getModelCommands;
    function modelCommandInputMap(ForgeModel, resourcePath) {
        var project = modelProject(ForgeModel, resourcePath);
        var commandInputs = project.$commandInputs;
        if (!commandInputs) {
            commandInputs = {};
            project.$commandInputs = commandInputs;
        }
        return commandInputs;
    }
    function getModelCommandInputs(ForgeModel, resourcePath, id) {
        var commandInputs = modelCommandInputMap(ForgeModel, resourcePath);
        return commandInputs[id];
    }
    Forge.getModelCommandInputs = getModelCommandInputs;
    function setModelCommandInputs(ForgeModel, resourcePath, id, item) {
        var commandInputs = modelCommandInputMap(ForgeModel, resourcePath);
        return commandInputs[id] = item;
    }
    Forge.setModelCommandInputs = setModelCommandInputs;
})(Forge || (Forge = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
var Forge;
(function (Forge) {
    Forge._module = angular.module(Forge.pluginName, ['hawtio-core', 'hawtio-ui', 'wiki']);
    Forge.controller = PluginHelpers.createControllerFunction(Forge._module, Forge.pluginName);
    Forge.route = PluginHelpers.createRoutingFunction(Forge.templatePath);
    Forge._module.config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when(UrlHelpers.join(Forge.context, '/addProject'), Forge.route('addProject.html', false)).when(UrlHelpers.join(Forge.context, '/projects/:path*'), Forge.route('projects.html', false)).when(UrlHelpers.join(Forge.context, '/projects'), Forge.route('projects.html', false)).when(UrlHelpers.join(Forge.context, '/commands'), Forge.route('commands.html', false)).when(UrlHelpers.join(Forge.context, '/commands/:path*'), Forge.route('commands.html', false)).when(UrlHelpers.join(Forge.context, '/command/:id'), Forge.route('command.html', false)).when(UrlHelpers.join(Forge.context, '/command/:id/:path*'), Forge.route('command.html', false)).when(Forge.context, { redirectTo: UrlHelpers.join(Forge.context, 'projects') });
    }]);
    // set up a promise that supplies the API URL for Forge, proxied if necessary
    Forge._module.factory('ForgeApiURL', ['jolokiaUrl', 'jolokia', '$q', '$rootScope', function (jolokiaUrl, jolokia, $q, $rootScope) {
        return "/api/forge";
    }]);
    Forge._module.factory('ForgeModel', ['jolokiaUrl', 'jolokia', '$q', '$rootScope', function (jolokiaUrl, jolokia, $q, $rootScope) {
        return {
            rootProject: {},
            projects: []
        };
    }]);
    Forge._module.run(['viewRegistry', 'workspace', 'HawtioNav', function (viewRegistry, workspace, HawtioNav) {
        Forge.log.debug("Running");
        viewRegistry['forge'] = Forge.templatePath + 'layoutForge.html';
        var builder = HawtioNav.builder();
        var projects = builder.id('forge-projects').href(function () { return UrlHelpers.join(Forge.context, 'projects'); }).title(function () { return 'Projects'; }).build();
        var commands = builder.id('forge-commands').href(function () { return UrlHelpers.join(Forge.context, 'commands'); }).title(function () { return 'Command'; }).build();
        var mainTab = builder.id('forge').rank(100).defaultPage({
            rank: 100,
            isValid: function (yes, no) {
                yes();
            }
        }).href(function () { return Forge.context; }).title(function () { return 'Forge'; }).isValid(function () { return Forge.isForge(workspace); }).tabs(projects, commands).build();
        HawtioNav.add(mainTab);
        // disable the images page for now...
        var navItems = HawtioNav.items || [];
        var dockerRegistry = navItems.find(function (item) { return item.id === "docker-registry"; });
        if (dockerRegistry) {
            dockerRegistry.isValid = function () { return false; };
        }
    }]);
    hawtioPluginLoader.addModule(Forge.pluginName);
})(Forge || (Forge = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="forgePlugin.ts"/>
var Forge;
(function (Forge) {
    Forge.CommandController = Forge.controller("CommandController", ["$scope", "$templateCache", "$location", "$routeParams", "$http", "$timeout", "ForgeApiURL", "ForgeModel", function ($scope, $templateCache, $location, $routeParams, $http, $timeout, ForgeApiURL, ForgeModel) {
        $scope.model = ForgeModel;
        $scope.resourcePath = $routeParams["path"] || $location.search()["path"];
        $scope.id = $routeParams["id"];
        $scope.path = $routeParams["path"];
        $scope.commandsLink = Forge.commandsLink($scope.resourcePath);
        $scope.itemConfig = {
            properties: {}
        };
        $scope.item = Forge.getModelCommandInputs(ForgeModel, $scope.resourcePath, $scope.id);
        $scope.fetched = $scope.item;
        $scope.$on('$routeUpdate', function ($event) {
            updateData();
        });
        updateData();
        function updateData() {
            $scope.item = null;
            if ($scope.id) {
                var url = UrlHelpers.join(ForgeApiURL, "commandInput", $scope.id, $scope.resourcePath);
                $http.get(url).success(function (data, status, headers, config) {
                    if (data) {
                        $scope.fetched = true;
                        $scope.item = data;
                        Forge.setModelCommandInputs(ForgeModel, $scope.resourcePath, $scope.id, $scope.item);
                    }
                    Core.$apply($scope);
                }).error(function (data, status, headers, config) {
                    Forge.log.warn("Failed to load " + url + " " + data + " " + status);
                });
            }
            else {
                Core.$apply($scope);
            }
        }
    }]);
})(Forge || (Forge = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="forgePlugin.ts"/>
var Forge;
(function (Forge) {
    Forge.CommandsController = Forge.controller("CommandsController", ["$scope", "$dialog", "$window", "$templateCache", "$routeParams", "$location", "localStorage", "$http", "$timeout", "ForgeApiURL", "ForgeModel", function ($scope, $dialog, $window, $templateCache, $routeParams, $location, localStorage, $http, $timeout, ForgeApiURL, ForgeModel) {
        $scope.model = ForgeModel;
        $scope.resourcePath = $routeParams["path"] || $location.search()["path"];
        $scope.commands = Forge.getModelCommands(ForgeModel, $scope.resourcePath);
        $scope.fetched = $scope.commands.length !== 0;
        $scope.tableConfig = {
            data: 'commands',
            showSelectionCheckbox: true,
            enableRowClickSelection: false,
            multiSelect: true,
            selectedItems: [],
            filterOptions: {
                filterText: $location.search()["q"] || ''
            },
            columnDefs: [
                {
                    field: 'name',
                    displayName: 'Name',
                    cellTemplate: $templateCache.get("idTemplate.html")
                },
                {
                    field: 'description',
                    displayName: 'Description'
                },
                {
                    field: 'category',
                    displayName: 'Category'
                }
            ]
        };
        var url = UrlHelpers.join(ForgeApiURL, "commands", $scope.resourcePath);
        Forge.log.info("Fetching commands from: " + url);
        $http.get(url).success(function (data, status, headers, config) {
            if (angular.isArray(data) && status === 200) {
                var resourcePath = $scope.resourcePath;
                $scope.commands = _.sortBy(data, "name");
                angular.forEach($scope.commands, function (command) {
                    var name = command.name;
                    command.$link = Forge.commandLink(name, resourcePath);
                });
                Forge.setModelCommands($scope.model, $scope.resourcePath, $scope.commands);
                $scope.fetched = true;
            }
        }).error(function (data, status, headers, config) {
            Forge.log.warn("failed to load " + url + ". status: " + status + " data: " + data);
        });
    }]);
})(Forge || (Forge = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="forgePlugin.ts"/>
var Forge;
(function (Forge) {
    Forge.ProjectController = Forge.controller("ProjectController", ["$scope", "$templateCache", "$location", "$routeParams", "$http", "$timeout", "ForgeApiURL", function ($scope, $templateCache, $location, $routeParams, $http, $timeout, ForgeApiURL) {
        $scope.project = {
            path: ""
        };
        $scope.save = function () {
            Forge.log.info("Saving " + angular.toJson($scope.project));
            if ($scope.project.path) {
                var url = Forge.projectsApiUrl(ForgeApiURL);
                $http.post(url, $scope.project).success(function (data, status, headers, config) {
                    $location.path("/forge/projects");
                }).error(function (data, status, headers, config) {
                    Forge.log.warn("failed to load " + url + ". status: " + status + " data: " + data);
                    var message = "Failed to POST to " + url + " got status: " + status;
                    Core.notification('error', message);
                });
            }
        };
        $scope.$on('$routeUpdate', function ($event) {
            updateData();
        });
        updateData();
        function updateData() {
        }
    }]);
})(Forge || (Forge = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="forgePlugin.ts"/>
var Forge;
(function (Forge) {
    Forge.ProjectsController = Forge.controller("ProjectsController", ["$scope", "$dialog", "$window", "$templateCache", "$routeParams", "$location", "localStorage", "$http", "$timeout", "ForgeApiURL", function ($scope, $dialog, $window, $templateCache, $routeParams, $location, localStorage, $http, $timeout, ForgeApiURL) {
        $scope.resourcePath = $routeParams["path"];
        $scope.commandsLink = Forge.commandsLink;
        $scope.tableConfig = {
            data: 'projects',
            showSelectionCheckbox: true,
            enableRowClickSelection: false,
            multiSelect: true,
            selectedItems: [],
            filterOptions: {
                filterText: $location.search()["q"] || ''
            },
            columnDefs: [
                {
                    field: 'path',
                    displayName: 'Path',
                    cellTemplate: $templateCache.get("projectTemplate.html")
                }
            ]
        };
        $scope.openCommands = function () {
            var resourcePath = null;
            var selected = $scope.tableConfig.selectedItems;
            if (_.isArray(selected) && selected.length) {
                resourcePath = selected[0].path;
            }
            var link = Forge.commandsLink(resourcePath);
            Forge.log.info("moving to commands link: " + link);
            $location.path(link);
        };
        $scope.delete = function (projects) {
            UI.multiItemConfirmActionDialog({
                collection: projects,
                index: 'path',
                onClose: function (result) {
                    if (result) {
                        doDelete(projects);
                    }
                },
                title: 'Delete projects?',
                action: 'The following projects will be removed (though the files will remain on your file system):',
                okText: 'Delete',
                okClass: 'btn-danger',
                custom: "This operation is permanent once completed!",
                customClass: "alert alert-warning"
            }).open();
        };
        function doDelete(projects) {
            angular.forEach(projects, function (project) {
                Forge.log.info("Deleting " + angular.toJson($scope.projects));
                var path = project.path;
                if (path) {
                    var url = Forge.projectApiUrl(ForgeApiURL, path);
                    $http.delete(url).success(function (data, status, headers, config) {
                        updateData();
                    }).error(function (data, status, headers, config) {
                        Forge.log.warn("failed to load " + url + ". status: " + status + " data: " + data);
                        var message = "Failed to POST to " + url + " got status: " + status;
                        Core.notification('error', message);
                    });
                }
            });
        }
        function updateData() {
            var url = Forge.projectsApiUrl(ForgeApiURL);
            $http.get(url).success(function (data, status, headers, config) {
                if (angular.isArray(data) && status === 200) {
                    $scope.projects = _.sortBy(data, "name");
                    angular.forEach($scope.projects, function (project) {
                        var resourcePath = project.path;
                        project.$commandsLink = Forge.commandsLink(resourcePath);
                    });
                    if (!$scope.projects || !$scope.projects.length) {
                        $location.path("/forge/addProject");
                    }
                    $scope.fetched = true;
                }
            }).error(function (data, status, headers, config) {
                Forge.log.warn("failed to load " + url + ". status: " + status + " data: " + data);
            });
        }
        updateData();
    }]);
})(Forge || (Forge = {}));

angular.module("hawtio-forge-templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("plugins/forge/html/addProject.html","<div class=\"row\" ng-controller=\"Forge.ProjectController\">\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <form>\n        <div class=\"form-group\">\n          <label for=\"projectFolder\">Project folder</label>\n          <input type=\"text\" class=\"form-control\" id=\"projectFolder\"\n                 placeholder=\"Enter folder path for project\" title=\"the projects folder path\"\n                 ng-model=\"project.path\"\n                 required autofocus>\n        </div>\n<!--\n        <div class=\"form-group\">\n            <label for=\"projectFile\">Choose folder</label>\n            <input type=\"file\" id=\"projectFile\"\n                   ng-model=\"project.resourcePath\">\n            <p class=\"help-block\">Either type the folder path or pick the folder.</p>\n          </div>\n-->\n        <button type=\"submit\" class=\"btn btn-primary\"\n                ng-disabled=\"!project.path\"\n                ng-click=\"save()\">\n          Add Project\n        </button>\n      </form>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/command.html","<div ng-controller=\"Forge.CommandController\">\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\"\n              href=\"{{commandsLink}}\"><i class=\"fa fa-list\"></i></a>\n      <button class=\"btn btn-primary pull-right\"\n              title=\"Perform this command\"\n              ng-click=\"execute()\">\n        Execute\n      </button>\n    </div>\n  </div>\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <div ng-hide=\"fetched\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n      <div ng-show=\"fetched\">\n        <div hawtio-object=\"item\" config=\"itemConfig\"></div>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/commands.html","<div class=\"row\" ng-controller=\"Forge.CommandsController\">\n  <div class=\"row\">\n    <div class=\"col-md-12\" ng-show=\"commands.length\">\n      <span ng-show=\"!id\">\n        Command: <hawtio-filter ng-model=\"tableConfig.filterOptions.filterText\"\n                       css-class=\"input-xxlarge\"\n                       placeholder=\"Filter commands...\"></hawtio-filter>\n      </span>\n    </div>\n  </div>\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <div ng-hide=\"fetched\">\n        <div class=\"align\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n      <div ng-show=\"fetched\">\n        <div ng-hide=\"commands.length\" class=\"align-center\">\n          <p class=\"alert alert-info\">There are no commands available!</p>\n        </div>\n        <div ng-show=\"commands.length\">\n          <table class=\"table table-condensed table-striped\" hawtio-simple-table=\"tableConfig\"></table>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/layoutForge.html","<script type=\"text/ng-template\" id=\"idTemplate.html\">\n  <div class=\"ngCellText\">\n    <a href=\"\"\n       title=\"Execute command {{row.entity.name}}\"\n       ng-href=\"{{row.entity.$link}}\">\n      {{row.entity.name}}</a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"projectTemplate.html\">\n  <div class=\"ngCellText\">\n    <a href=\"\"\n       title=\"Commands for project {{row.entity.path}}\"\n       ng-href=\"{{row.entity.$commandsLink}}\">\n      {{row.entity.path}}</a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"categoryTemplate.html\">\n  <div class=\"ngCellText\">\n    <span class=\"pod-label badge\"\n          class=\"background-light-grey mouse-pointer\">{{row.entity.category}}</span>\n  </div>\n</script>\n\n<div class=\"row\">\n  <div class=\"wiki-icon-view\">\n    <div class=\"row forge-view\" ng-view></div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/projects.html","<div class=\"row\" ng-controller=\"Forge.ProjectsController\">\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <hawtio-filter ng-model=\"tableConfig.filterOptions.filterText\"\n                     ng-show=\"projects.length\"\n                     css-class=\"input-xxlarge\"\n                     placeholder=\"Filter projects...\"></hawtio-filter>\n      <button class=\"btn btn-primary pull-right\"\n              ng-click=\"openCommands()\">\n        Commands\n      </button>\n      <span class=\"pull-right\">&nbsp;</span>\n      <button ng-show=\"fetched\"\n              class=\"btn btn-danger pull-right\"\n              ng-disabled=\"tableConfig.selectedItems.length == 0\"\n              ng-click=\"delete(tableConfig.selectedItems)\">\n        <i class=\"fa fa-remove\"></i> Delete\n      </button>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\" href=\"/forge/addProject\">\n        <i class=\"fa fa-plus\"></i> Add Project\n      </a>\n    </div>\n  </div>\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <div ng-hide=\"fetched\">\n        <div class=\"align\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n      <div ng-show=\"fetched\">\n        <div ng-hide=\"projects.length\" class=\"align-center\">\n          <p class=\"alert alert-info\">There are no projects available!</p>\n        </div>\n        <div ng-show=\"projects.length\">\n          <table class=\"table table-condensed table-striped\" hawtio-simple-table=\"tableConfig\"></table>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n");}]); hawtioPluginLoader.addModule("hawtio-forge-templates");