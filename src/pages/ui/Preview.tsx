import React from "react";
import AppShell from "../../components/layout/AppShell";
import Button from "../../components/ui/Button";
import TextField from "../../components/ui/TextField";
import Select from "../../components/ui/Select";
import Badge from "../../components/ui/Badge";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import Tabs from "../../components/ui/Tabs";
import Modal from "../../components/ui/Modal";
import Steps from "../../components/ui/Steps";

export default function Preview() {
  const [tab, setTab] = React.useState("atoms");
  const [open, setOpen] = React.useState(false);

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">UI Kit Preview</h1>

        <Tabs tabs={[{id:'atoms',label:'Atoms'},{id:'molecules',label:'Molecules'}]} value={tab} onChange={setTab} />

        {tab === 'atoms' && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>Buttons</CardHeader>
              <CardBody className="space-x-2">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
                <Button loading>Loading</Button>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>Text fields</CardHeader>
              <CardBody className="space-y-3">
                <TextField label="Label" placeholder="Placeholder" />
                <TextField label="Password" type="password" passwordToggle placeholder="••••••" />
                <TextField label="Error" error="This is invalid" placeholder="Try typing" />
              </CardBody>
            </Card>

            <Card>
              <CardHeader>Select & Badge</CardHeader>
              <CardBody className="space-y-3">
                <Select label="Select one" defaultValue="">
                  <option value="" disabled>Select...</option>
                  <option>Option A</option>
                  <option>Option B</option>
                </Select>
                <div className="space-x-2">
                  <Badge variant="info">Info</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="error">Error</Badge>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {tab === 'molecules' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>Steps</CardHeader>
              <CardBody>
                <Steps steps={[{id:'basic',label:'Basic Info'},{id:'business',label:'Business'},{id:'pro',label:'Professional'},{id:'social',label:'Social'}]} current="business" />
              </CardBody>
            </Card>

            <Card>
              <CardHeader>Modal</CardHeader>
              <CardBody className="space-y-3">
                <Button onClick={()=>setOpen(true)}>Open modal</Button>
                <Modal open={open} onClose={()=>setOpen(false)} title="Sample Modal">
                  <p>This is a modal content region.</p>
                </Modal>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
