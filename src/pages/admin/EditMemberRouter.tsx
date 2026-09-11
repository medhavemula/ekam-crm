import { useParams } from "react-router-dom";
import EditMemberPage from "./EditMemberPage";

export default function EditMemberRouter() {
  const { memberId } = useParams<{ memberId: string }>();
  
  return <EditMemberPage memberId={memberId || ""} />;
}
