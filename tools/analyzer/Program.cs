using System.Text.Json;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

if (args.Length < 1)
{
    Console.Error.WriteLine("Usage: analyzer <folder-path>");
    Environment.Exit(1);
    return;
}

var targetPath = args[0];
var classResults = new List<object>();

if (Directory.Exists(targetPath))
{
    foreach (var filePath in Directory.EnumerateFiles(targetPath, "*.cs", SearchOption.AllDirectories))
    {
        try
        {
            var sourceText = File.ReadAllText(filePath);
            var root = CSharpSyntaxTree.ParseText(sourceText).GetRoot();
            var relativePath = Path.GetRelativePath(targetPath, filePath).Replace('\\', '/');

            foreach (var classDecl in root.DescendantNodes().OfType<ClassDeclarationSyntax>())
            {
                var baseTypes = classDecl.BaseList?.Types
                    .Select(t => t.Type.ToString())
                    .ToList() ?? new List<string>();

                // "Referenced types" only approximates dependencies from identifiers used inside
                // the class body (methods/fields/properties) — Syntax-only analysis can't tell a
                // type name apart from a variable or method call with the same identifier text.
                var referencedTypes = classDecl.Members
                    .SelectMany(member => member.DescendantNodes().OfType<IdentifierNameSyntax>())
                    .Select(id => id.Identifier.Text)
                    .Distinct()
                    .ToList();

                var methodCount = classDecl.Members.OfType<MethodDeclarationSyntax>().Count();

                classResults.Add(new
                {
                    name = classDecl.Identifier.Text,
                    filePath = relativePath,
                    baseTypes,
                    referencedTypes,
                    methodCount,
                });
            }
        }
        catch
        {
            // One unreadable/malformed file shouldn't abort the whole analysis run — skip it.
            continue;
        }
    }
}

Console.WriteLine(JsonSerializer.Serialize(new { classes = classResults }));
