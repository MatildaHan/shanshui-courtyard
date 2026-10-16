"""Verify the local MCP server separately from the Unity Editor bridge."""
import asyncio, json, os
from importlib.metadata import version
from pathlib import Path
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

ROOT = Path(__file__).resolve().parents[1]
SERVER = Path.home() / '.codex/mcp/unity-mcp-v10.3.0/Server/.venv/Scripts/mcp-for-unity.exe'

async def verify():
    env = {**os.environ, 'UNITY_MCP_DISABLE_TELEMETRY': '1', 'PYTHONIOENCODING': 'utf-8'}
    params = StdioServerParameters(command=str(SERVER), args=['--transport', 'stdio'], env=env)
    with (ROOT / 'tests/results/unity-mcp-server.log').open('w', encoding='utf-8') as log:
        async with stdio_client(params, errlog=log) as (read, write):
            async with ClientSession(read, write) as session:
                init = await session.initialize()
                tools = await session.list_tools()
                resources = await session.list_resources()
                result = {'server': init.serverInfo.model_dump(), 'package_version': version('mcpforunityserver'), 'tool_count': len(tools.tools),
                          'tools': [tool.name for tool in tools.tools],
                          'resources': [str(resource.uri) for resource in resources.resources],
                          'editor_connected': False}
                instances = next((r for r in resources.resources if 'instances' in str(r.uri)), None)
                if instances:
                    response = await session.read_resource(instances.uri)
                    result['unity_instances'] = response.model_dump(mode='json')
                    for item in response.contents:
                        if hasattr(item, 'text'):
                            data = json.loads(item.text)
                            result['editor_connected'] = data.get('instance_count', 0) > 0
                (ROOT / 'tests/results/unity-mcp-verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
                print(json.dumps(result, ensure_ascii=False))

asyncio.run(asyncio.wait_for(verify(), timeout=45))
