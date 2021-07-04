function addDragHandlersToSvg(evt) {
  console.log("Henlo.");

  let svg = evt.target;

  let draggedElement = null;
  let draggedOffsetInSvgCoordinates = null;

  function getMousePositionInSvgCoordinates(evt) {
    var svgCtm = svg.getScreenCTM();
    return {
      x: (evt.clientX - svgCtm.e)/svgCtm.a,
      y: (evt.clientY - svgCtm.f)/svgCtm.d,
    };
  }

  function getDraggableGroupPositionInSvgCoordinates(draggable) {
    let svgCtm = svg.getScreenCTM();
    let draggableCtm = draggable.getScreenCTM();
    return {
      x: (draggableCtm.e - svgCtm.e)/svgCtm.a,
      y: (draggableCtm.f - svgCtm.f)/svgCtm.d,
    }
  }

  function startDrag(evt) {
    draggedElement = evt.target.closest('.drag_handle').closest('.draggable');  // A drag_handle must be nested in a draggable
    let mousePosition = getMousePositionInSvgCoordinates(evt);
    let draggablePosition = getDraggableGroupPositionInSvgCoordinates(draggedElement);
    draggedOffsetInSvgCoordinates = {
      x: draggablePosition.x - mousePosition.x,
      y: draggablePosition.y - mousePosition.y,
    };
  }

  function onMouseDown(evt) {
    if (evt.button === 0 && evt.target.closest('.drag_handle') && !evt.target.closest('.disable_dragging')) {
      startDrag(evt);
    }
  }

  function onClick(evt) {
    if (evt.button === 0 && evt.target.closest('.close_button')) {
      svg.removeChild(evt.target.closest('.closeable'));
      // Once connections are implemented, any connections will also have to be deleted here.
    }
  }

  function drag(evt) {
    if (draggedElement) {
      // Note: draggable elements must ONLY have a translate transform
      evt.preventDefault();
      let mousePosition = getMousePositionInSvgCoordinates(evt);
      let newPosition = {
        x: mousePosition.x + draggedOffsetInSvgCoordinates.x,
        y: mousePosition.y + draggedOffsetInSvgCoordinates.y,
      };
      draggedElement.setAttributeNS(null, "transform", "translate(" + newPosition.x + "," + newPosition.y + ")");
    }
  }

  function endDrag(evt) {
    if (draggedElement) {
      draggedElement = null;
    }
  }

  svg.addEventListener('mousedown', onMouseDown);
  svg.addEventListener('click', onClick);
  svg.addEventListener('mousemove', drag);
  svg.addEventListener('mouseup', endDrag);
  svg.addEventListener('mouseleave', endDrag);
}
