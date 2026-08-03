import { Link } from "react-router-dom";

export default function Footer(){

return (
<footer className="site-footer">
<div className="container">

<span>dynR</span>

<span>
© 2026 dynR. All rights reserved.
</span>

<Link to="/login" style={{ fontSize: "0.85em", opacity: 0.7 }}>
  Restaurant Sign In
</Link>

</div>
</footer>
)

}