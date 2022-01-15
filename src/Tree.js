import './tech-tree.scss';
import Data from "./Data";
import { useRef, useState } from "react";
import { Base64 } from "js-base64";

/**
 * Longevity Tech Tree
 * Copyright 2022 Foresight Institute
 * @returns {JSX.Element}
 * @constructor
 */

const Tree = () => {
  /**
   * Load Octokit for Github integration
   */
  const { Octokit } = require("@octokit/core");
  const { createPullRequest } = require("octokit-plugin-create-pull-request");
  /**
   * Template for new nodes
   * @type {{title: string, type: string}}
   */
  const NodeTemplate = {
    title: '',
    type: '',
  }
  /**
   * Edit mode state
   */
  const [editMode, setEditMode] = useState(false);
  /**
   * Check if user made any changes
   */
  const [madeChanges, setMadeChanges] = useState(false);
  /**
   * Node that's currently being edited or created
   */
  const [editingNode, setEditingNode] = useState(null);
  /**
   * Check if the edited node is new or not
   */
  const [isNewNode, setIsNewNode] = useState(false);
  /**
   * Reference of inputs for editing or creating nodes
   */
  const inputRef = useRef();
  const relationsRef = useRef();
  const selectRef = useRef();
  /**
   * Tree data fetched from the original data file,
   * then saved as a state to modify later
   */
  const [treeData, setTreeData] = useState(Data);
  /**
   * Location Reference
   * Stores the absolute location of node elements for future usage
   * @type {[]}
   */
  let locRef = [];
  /**
   * Count of nodes without previous relations
   * @type {number}
   */
  let starterCount = 0;
  /**
   * Size of node + desired spacing
   * @type {number}
   */
  const pixelDiff = 100;
  /**
   * Submission user details
   * TODO: refs maybe? state change is a bit laggy when typing (bc re-rendering tree)
   */
  const [submitName, setSubmitName] = useState(null);
  const [submitEmail, setSubmitEmail] = useState(null);
  /**
   * Loading & submission states
   */
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  /**
   * Submit changes to Github
   * @returns {Promise<void>}
   */
  const submitChanges = () => {
    setLoading(true);
    /**
     * Pull request Octokit plugin
     */
    const MyOctokit = Octokit.plugin(createPullRequest);
    /**
     * Authenticate with Github using access token
     * stored in Vercel
     * @type {string}
     */
    const TOKEN = process.env.GITHUB_ACCESS_TOKEN;
    const octokit = new MyOctokit({
      auth: TOKEN,
    });
    /**
     * Open a pull request with tree data changes
     * Encode tree state and replace Data.js file
     */
    octokit
      .createPullRequest({
        owner: "KaiMicahMills",
        repo: "tech-tree",
        title: `Tech Tree Changes from ${submitName}`,
        body: `Submitted from ${submitEmail}`,
        base: "staging",
        head: `tree-change/${submitName.replace(' ', '-')}-${new Date().getTime()}`,
        changes: [
          {
            files: {
              "src/Data.js": {
                content: Base64.encode(`const Data=${JSON.stringify(treeData)}; export default Data;`),
                encoding: "base64",
              },
            },
            commit:
              `Tech tree changes from ${submitName}`,
          },
        ],
      })
      .then(() => {
        /**
         * Submission successful
         */
        setSubmitted(true);
        setLoading(false);
      }).catch((err) => {
        console.log(err);
    });
  };

  /**
   * Render tree
   */
  return (
    <>
      <div className={`tree ${editMode ? 'editing' : 'viewing'}`}>
        <div className="header">
          <div className="header-block">
            <img src="/foresight.png" alt="Foresight Institute" />
            <h1>Longevity Tech Tree</h1>
            <h3>Prototype v0.1 (Jan 8, 2022)</h3>
            <br />
            <h4>
              <a
                href="https://fsnone-bb4c.kxcdn.com/wp-content/uploads/2021/10/Longevity-Technology.pdf"
                target="_blank"
                rel="noreferrer"
              >
                View the full document
              </a>
            </h4>
            <h4>
              <a
                href="https://app.markup.io/invite/accept/t5KhhVoe"
                target="_blank"
                rel="noreferrer"
              >
                Provide feedback
              </a>
            </h4>
          </div>
          <div className="header-block">
            <h4>Key:</h4>
            <br />
            <div className="key blue">
              Core Technology
            </div>
            <div className="key purple">
              Longevity Tech
            </div>
            <div className="key yellow">
              General Improvement
            </div>
          </div>
        </div>
        <div className="sections">
          <div className="edit-cover">
            {
              editMode && madeChanges && (
                <div className="submit-cover">
                  <input type="text" id="name" placeholder="Name" onChange={(e) => setSubmitName(e.target.value)}></input>
                  <input type="email" id="email" placeholder="Email" onChange={(e) => setSubmitEmail(e.target.value)}></input>
                  <div className={`submit ${(loading || !submitName || !submitEmail) ? 'disabled' : ''}`} onClick={() => submitChanges()}>
                    {
                      loading
                        ? <>Loading...</>
                        : <>Submit <i className="fa fa-check"/></>
                    }
                  </div>
                </div>
              )
            }
            <div className="edit" onClick={() => setEditMode(!editMode)}>
              <p>{editMode ? <>View Mode</> : <>Edit Mode</>}</p>
              { editMode ? <i className="fa fa-eye" /> : <i className="fa fa-network-wired" /> }
            </div>
          </div>
          <div className="nodes">
            {
              treeData.map((node, index) => {
                /**
                 * Set ID of node
                 * @type {string}
                 */
                const id = node.title.replace(/\s/g, '-').toLowerCase();
                /**
                 * Position multiplier based on render index
                 * @type {number}
                 */
                const multiplier = starterCount + 1;
                /**
                 * Default positioning
                 * @type {number}
                 */
                const fontWidth = 10;
                let t = pixelDiff * multiplier;
                let l = pixelDiff * multiplier;
                /**
                 * Check if node has any backwards relations
                 */
                const startingPoints = [];
                let relList = '';
                if (node.relations && node.relations.length) {
                  /**
                   * Build string for edit mode from relations list
                   */
                  relList = node.relations.join(', ');
                  let pushed = false;
                  locRef.forEach((n) => {
                    /**
                     * Find the top position of the backwards relation and match it
                     */
                    if (n.id === node.relations[0].replace(/\s/g, '-').toLowerCase()) {
                      t = n.top;
                      l = n.left + ((n.id.length * fontWidth) + pixelDiff);
                    } else {
                      /**
                       * Check if a node is already in this position
                       */
                      if (n.top === t) {
                        t = t + pixelDiff;
                        if (n.left === l && !pushed) {
                          starterCount = starterCount + 1;
                          pushed = true;
                        }
                      }
                    }
                    /**
                     * Save relation starting points to draw lines later
                     */
                    node.relations.forEach((relation) => {
                      if (n.id === relation.replace(/\s/g, '-').toLowerCase()) {
                        startingPoints.push({
                          id: n.id,
                          top: n.top,
                          left: n.left,
                        });
                      }
                    })
                  });
                } else {
                  /**
                   * Node has no backwards relations
                   * @type {number}
                   */
                  starterCount = starterCount + 1;
                  l = 0;
                }
                /**
                 * Position styling
                 */
                const position = {
                  top: t,
                  left: l,
                };
                /**
                 * Add node to location reference
                 * @type {*[]}
                 */
                const newLocRef = locRef;
                newLocRef.push({
                  id: id,
                  top: position.top,
                  left: position.left,
                });
                locRef = newLocRef;
                /**
                 * Node height & caret height for dynamic connection positions
                 * TODO: Get from refs of respective divs instead of hardcode
                 * @type {number}
                 */
                const caretHeight = 12;
                const nodeHeight = 47;
                /**
                 * Reference for most recent dynamic connection `top` value
                 * @type {number}
                 */
                let caretRef = 0;
                let lineRef = 0;
                /**
                 * Render the node
                 */
                return (
                  <div key={index}>
                    {
                      startingPoints.length ? (
                        <>
                          {
                            startingPoints.map((point, index) => {
                              /**
                               * Add height of caret to reference
                               * @type {number}
                               */
                              lineRef = lineRef + caretHeight;
                              /**
                               * Check if it's the first line
                               */
                              if (index === 0) {
                                /**
                                 * Center lines vertically
                                 * @type {number}
                                 */
                                const verticalDiff = nodeHeight - (caretHeight * startingPoints.length);
                                lineRef = verticalDiff / 2;
                              }
                              /**
                               * Lower the opacity for based on long node connection length
                               * @type {number}
                               */
                              let strokeOpacity = 1;
                              if (Math.abs(position.top) - Math.abs(point.top) > 200) strokeOpacity = 0.75;
                              if (Math.abs(position.top) - Math.abs(point.top) > 400) strokeOpacity = 0.5;
                              if (Math.abs(position.top) - Math.abs(point.top) > 600) strokeOpacity = 0.25;
                              /**
                               * Horizontal and vertical line positioning
                               * @type {number}
                               */
                              const ranX = lineRef + 35;
                              const ranY = lineRef;
                              /**
                               * Render node connections
                               */
                              return (
                                <svg key={point.id} style={{ marginTop: 7 }}>
                                  <line x1={point.left} y1={point.top + ranY} x2={position.left - ranX} y2={point.top + ranY} strokeWidth="2" stroke="transparent" strokeOpacity={strokeOpacity}>
                                    <animate attributeName="x2" from={point.left} to={position.left - ranX} dur="2s" />
                                    <animate attributeName="y2" from={point.top + ranY} to={point.top + ranY} dur="2s" />
                                    <animate attributeName="stroke" from="transparent" to="white" dur="2s" fill="freeze" repeatCount="1" />
                                  </line>
                                  <line x1={position.left - ranX} y1={point.top + ranY} x2={position.left - ranX} y2={position.top + ranY} strokeWidth="2" stroke="transparent" strokeOpacity={strokeOpacity}>
                                    <animate attributeName="x2" from={position.left - ranX} to={position.left - ranX} begin="2s" dur="1s" />
                                    <animate attributeName="y2" from={point.top + ranY} to={position.top + ranY} begin="2s" dur="1s" />
                                    <animate attributeName="stroke" from="transparent" to="white" begin="2s" dur="0.1s" fill="freeze" repeatCount="1" />
                                  </line>
                                  <line x1={position.left - ranX} y1={position.top + ranY} x2={position.left} y2={position.top + ranY} strokeWidth="2" stroke="transparent" strokeOpacity={strokeOpacity}>
                                    <animate attributeName="x2" from={position.left - ranX} to={position.left} begin="3s" dur="0.5s" />
                                    <animate attributeName="y2" from={position.top + ranY} to={position.top + ranY} begin="3s" dur="0.5s" />
                                    <animate attributeName="stroke" from="transparent" to="white" begin="3s" dur="0.1s" fill="freeze" repeatCount="1" />
                                  </line>
                                </svg>
                              );
                            })
                          }
                        </>
                      ) : null
                    }
                    <div
                      className={`node ${node.type} ${editingNode === id ? 'top' : ''}`}
                      id={id}
                      style={position}
                    >
                      {
                        editMode ? (
                          <>
                            {
                              editingNode === id ? (
                                <div className="edit-inputs">
                                  <label htmlFor="title">Title:</label>
                                  <input id="title" type="text" defaultValue={node.title} ref={editingNode === id ? inputRef : null} />
                                  <label htmlFor="relations">Relations (separate by commas):</label>
                                  <input id="relations" type="text" defaultValue={relList} ref={editingNode === id ? relationsRef : null} />
                                  <label htmlFor="type">Type:</label>
                                  <select id="type" ref={editingNode === id ? selectRef : null} defaultValue={node.type}>
                                    <option value="core-technology">Core Technology</option>
                                    <option value="longevity-tech">Longevity Tech</option>
                                    <option value="general-improvement">General Improvement</option>
                                  </select>
                                </div>
                              ) : (
                                <>{node.title}</>
                              )
                            }
                          </>
                        ) : (
                          <>{node.title}</>
                        )
                      }
                      {
                        startingPoints.length ? startingPoints.map((point, index) => {
                          /**
                           * Add height of caret to reference
                           * @type {number}
                           */
                          caretRef = caretRef + caretHeight;
                          /**
                           * Check if it's the first caret
                           */
                          if (index === 0) {
                            /**
                             * Center carets vertically
                             * @type {number}
                             */
                            const verticalDiff = nodeHeight - (caretHeight * startingPoints.length);
                            caretRef = verticalDiff / 2;
                          }
                          /**
                           * Render carets
                           * TODO: match caret opacity to line opacity?
                           */
                          return (
                            <i className="fa fa-caret-right caret" style={{ top: caretRef }} key={index} />
                          )
                        }) : null
                      }
                      {
                        editMode && (
                          <div className="edit-icons">
                            {
                              editingNode === id ? (
                                <>
                                  <i className="fa fa-check" onClick={() => {
                                    /**
                                     * Add modified node to data structure
                                     */
                                    setMadeChanges(true);
                                    setEditingNode(null);
                                    /**
                                     * Find node location
                                     */
                                    let treeLoc = null;
                                    /**
                                     * Store tree data temporarily
                                     * @type {{}}
                                     */
                                    let d = treeData;
                                    /**
                                     * Update relations, if any, if edit changes name
                                     */
                                    d.forEach((n, i) => {
                                      if (n.relations && n.relations.length) {
                                        /**
                                         * Search to see if there are any
                                         * backwards relation matches
                                         */
                                        n.relations.forEach((r, ii) => {
                                          if (r === node.title) {
                                            /**
                                             * There's a match, let's replace it
                                             */
                                            d[i].relations.splice(ii, 1);
                                            d[i].relations.splice(ii, 0, inputRef.current.value);
                                          }
                                        })
                                      }
                                      if (n.title === node.title) {
                                        /**
                                         * Save node location for later
                                         */
                                        treeLoc = i;
                                      }
                                    });
                                    /**
                                     * Remove previous node
                                     */
                                    d = d.filter((n) => n.title !== node.title);
                                    setTreeData(d);
                                    /**
                                     * Build new node
                                     */
                                    let newNode = NodeTemplate;
                                    newNode.title = inputRef.current.value.trim();
                                    newNode.type = selectRef.current.value.replace(' ', '-').toLowerCase();
                                    newNode.relations = relationsRef.current.value.split(',').map((r) => r.trim());
                                    /**
                                     * Add node to correct location,
                                     */
                                    let tempData = d;
                                    tempData.splice(treeLoc, 0, newNode);
                                    setTreeData(tempData);
                                    setIsNewNode(false);
                                  }} />
                                  <i className="fa fa-ban" onClick={() => {
                                    /**
                                     * If cancelling new node
                                     */
                                    if (isNewNode) {
                                      setTreeData(treeData.filter((n) => n.title.replace(/\s/g, '-').toLowerCase() !== editingNode));
                                    }
                                    /**
                                     * Cancel
                                     */
                                    setIsNewNode(false);
                                    setEditingNode(null);
                                  }} />
                                </>
                              ) : (
                                <>
                                  <i className="fa fa-plus" onClick={() => {
                                    setEditingNode(null);
                                    setIsNewNode(true);
                                    /**
                                     * Creating new node
                                     * @type {{}}
                                     */
                                    let d = treeData;
                                    let treeLoc = null;
                                    /**
                                     * Find current node location, save for later
                                     */
                                    d.forEach((n, i) => {
                                      if (n.title === node.title) {
                                        treeLoc = i;
                                      } else if (n.title === `Node ${treeLoc + 1}`) {
                                        /**
                                         * If there are unmodified new nodes already,
                                         * continue creating unique names
                                         */
                                        treeLoc++;
                                      }
                                    });
                                    /**
                                     * Place new node after the current node
                                     */
                                    let newNode = NodeTemplate;
                                    newNode.title = `Node ${treeLoc + 1}`
                                    newNode.type = 'core-technology';
                                    newNode.relations = [`${node.title}`];
                                    d.splice(treeLoc + 1, 0, newNode);
                                    setEditingNode(newNode.title.replace(/\s/g, '-').toLowerCase());
                                    setTreeData(d);
                                  }} />
                                  <i className="fa fa-pencil" onClick={() => setEditingNode(id)} />
                                  <i className="fa fa-trash" onClick={() => {
                                    /**
                                     * Remove node from data structure
                                     */
                                    setMadeChanges(true);
                                    setTreeData(treeData.filter((n) => n.title !== node.title));
                                  }} />
                                </>
                              )
                            }
                          </div>
                        )
                      }
                    </div>
                    {
                      index === treeData.length - 1 && (
                        <div className="node-height" style={{ height: starterCount * (pixelDiff + 0.5) }}></div>
                      )
                    }
                  </div>
                );
              })
            }
          </div>
        </div>
        <div className="footer">
          <p>Copyright &copy; 2022 Foresight Institute, all rights reserved.</p>
        </div>
      </div>
      {
        submitted && (
          <div className="success">
            <h1>Submission successful!</h1>
            <div className="success-buttons">
              <a href="https://github.com/KaiMicahMills/tech-tree/pulls">
                <button onClick={() => setSubmitted(false)}>View Pull Request</button>
              </a>
              <button onClick={() => setSubmitted(false)}>Return to Tree</button>
            </div>
          </div>
        )
      }
    </>
  )
}

export default Tree;
