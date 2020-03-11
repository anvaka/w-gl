import miserables from 'miserables';
import forceLayout from 'ngraph.forcelayout3d';

export default function getGraph() {
  let graph = miserables.create();
  let layout = forceLayout(graph);
  for (let i = 0; i < 200; ++i) {
    layout.step();
  }
  graph.forEachNode(node => {
    node.data = layout.getNodePosition(node.id);
  })
  return graph;
}